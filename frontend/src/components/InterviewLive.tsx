import { useRef, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Mic, MicOff, PhoneOff, Send, Volume2, Settings, Zap, Mail, Loader2,
  CheckCircle2, Briefcase, Home, Video, VideoOff, MessageSquare, Users, BarChart3,
  Bell, Maximize2, Minimize2, Smile, ChevronLeft, Clock, Target, MessageCircle,
  Sparkles, ArrowRight, RotateCcw, Star, AlertTriangle, Play,
  Printer, FileText, ChevronDown, ChevronUp, ShieldCheck, HelpCircle, X, Award
} from 'lucide-react';
import axios from 'axios';
import AudioWaveform from './AudioWaveform';
import RadarChart from './RadarChart';

const voices = ['Kore', 'Puck', 'Charon', 'Fenrir'];
const languages = ['English', 'Indonesian', 'Bulgarian'];

const PHASE_LABELS = ['Pengenalan & Profil', 'Kompetensi Teknis', 'Soft Skill & Perilaku', 'Penutup'];
const PHASE_DESCRIPTIONS = [
  'Perkenalan diri, latar belakang pendidikan, dan pengalaman profesional.',
  'Pendalaman keahlian teknis sesuai persyaratan posisi yang dilamar.',
  'Studi kasus, kepemimpinan, kerja tim, dan resolusi tantangan kerja.',
  'Rangkuman evaluasi, kesempatan bertanya, dan penutup wawancara.'
];
const PHASE_TOKEN = /^\[FASE:([1-4])\]/;

// VAD (Voice Activity Detection) — enhanced for background noise resistance
const VAD_THRESHOLD = 0.025; // Tingkatkan ambang batas agar suara kipas/lingkungan tidak memicu VAD
const VAD_NOISE_FLOOR_INIT = 0.010;
const VAD_SHORT_PAUSE_MS = 350;
const VAD_LONG_PAUSE_MS = 1100;

const welcomeSteps = [
  {
    icon: <Sparkles className="w-8 h-8" />,
    title: 'Selamat Datang di AI Interview',
    description: 'Anda akan diwawancarai oleh Ava, AI Interviewer virtual cerdas. Siapkan diri Anda untuk sesi wawancara yang profesional dan terstruktur.',
    tips: ['Pastikan koneksi internet stabil', 'Gunakan headphone/earphone untuk kualitas audio terbaik', 'Cari tempat yang tenang dan minim gangguan']
  },
  {
    icon: <Mic className="w-8 h-8" />,
    title: 'Mikrofon & Audio Interaktif',
    description: 'Ava akan berbicara melalui audio, dan Anda dapat menjawab langsung menggunakan mikrofon atau mengetik jawaban di panel pesan.',
    tips: ['Klik tombol Mic untuk berbicara', 'Bicara dengan jelas dan artikulatif', 'Anda juga dapat mengetik pesan jika diperlukan']
  },
  {
    icon: <Video className="w-8 h-8" />,
    title: 'Kamera & Visualisasi Real-Time',
    description: 'Nyalakan kamera untuk melihat pratinjau video diri Anda layaknya video call nyata, dengan indikator gelombang suara audio real-time.',
    tips: ['Posisikan kamera sejajar dengan mata', 'Pastikan pencahayaan ruangan cukup terang', 'Aktifkan closed-caption jika butuh subtitel']
  },
  {
    icon: <Target className="w-8 h-8" />,
    title: 'Siap Memulai?',
    description: 'Sesi terdiri dari 4 fase: Pengenalan, Kompetensi Teknis, Soft Skill, dan Penutup. Di akhir sesi, Anda akan langsung menerima laporan skor dan analisis kompetensi.',
    tips: ['Jawab secara terstruktur dan jujur', 'Boleh mengambil jeda sebelum menjawab', 'Semua jawaban dinilai secara objektif oleh AI']
  }
];

interface ChatMessage {
  id: string;
  sender: 'candidate' | 'ai' | 'system';
  text: string;
}

interface Job {
  id: string;
  title: string;
  description: string;
  interviewDuration: number | null;
  interviewPassingScore: number | null;
}

interface ReportResult {
  fullName: string;
  email: string;
  appliedPosition: string;
  interviewStatus: string;
  interviewScore: number | null;
  skillMatrix: { skill: string; score: number; notes: string }[] | null;
  phases: { name: string; score: number; questions: { question: string; score: number; note: string }[] }[] | null;
  interviewResult: string | null;
  screeningScore: number | null;
  passingScore: number | null;
}

type AudioContextConstructor = typeof AudioContext;

export default function InterviewLive() {
  const [status, setStatus] = useState('Disconnected');
  const [text, setText] = useState('');
  const [voice, setVoice] = useState(voices[0]);
  const [language, setLanguage] = useState(languages[0]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Job selection
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [jobsLoading, setJobsLoading] = useState(true);

  // Interview identification & saving
  const [applicantEmail, setApplicantEmail] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveError, setSaveError] = useState('');

  // Email validation
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [applicantName, setApplicantName] = useState('');

  // UI state & navigation
  const [rightTab, setRightTab] = useState<'messages' | 'info' | 'stats' | 'tips'>('messages');
  const [elapsed, setElapsed] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);

  // Interactive controls: Mic, Camera, Captions, Fullscreen
  const [isMicOn, setIsMicOn] = useState(true);
  const isMicOnRef = useRef(true);
  useEffect(() => {
    isMicOnRef.current = isMicOn;
  }, [isMicOn]);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [showCaptions, setShowCaptions] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  // Welcome screen state
  const [showWelcome, setShowWelcome] = useState(true);
  const [welcomeStep, setWelcomeStep] = useState(0);

  // End interview summary state & transcript accordion
  const [showSummary, setShowSummary] = useState(false);
  const [showTranscriptDetails, setShowTranscriptDetails] = useState(false);
  const [interviewStats, setInterviewStats] = useState({
    totalQuestions: 0,
    totalAnswers: 0,
    totalChars: 0,
    duration: 0,
    exchanges: 0
  });

  // Question counter
  const [questionCount, setQuestionCount] = useState(0);

  // Interview phase: parsed from [FASE:n] tokens sent by the AI
  const [currentPhase, setCurrentPhase] = useState(0);

  // Proctoring / integrity: tab-switch & blur violations recorded while active
  const [proctorWarnings, setProctorWarnings] = useState<{ time: string; reason: string }[]>([]);
  const proctorLockRef = useRef(false);

  // Interview report: polled result after save (score, skill matrix, phases, recommendation)
  const [report, setReport] = useState<ReportResult | null>(null);
  const [reportLoading, setReportLoading] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);

  const audioContextInputRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isSpeakingRef = useRef(false);

  const vadNoiseFloorRef = useRef(VAD_NOISE_FLOOR_INIT);
  const vadLastSpeechMsRef = useRef(0);
  const vadUserWasSpeakingRef = useRef(false);
  const vadStateRef = useRef<'idle' | 'speaking' | 'awaiting-ai'>('idle');
  const vadAudioEndSentRef = useRef(false);
  const vadSpeechFramesRef = useRef(0);

  const [connectionQuality, setConnectionQuality] = useState<'good' | 'unstable' | 'poor'>('good');
  const [aiThinking, setAiThinking] = useState(false);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldReconnectRef = useRef(true);
  const isReconnectRef = useRef(false);
  const aiThinkingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeSourcesCountRef = useRef(0);
  const aiSpeakingCooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Timer for elapsed time — berjalan terus menerus selama interview aktif
  useEffect(() => {
    if (status !== 'Disconnected' && status !== 'Connecting') {
      elapsedRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      setElapsed(0);
    }
    return () => { if (elapsedRef.current) clearInterval(elapsedRef.current); };
  }, [status]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h > 0 ? String(h).padStart(2, '0') + ':' : ''}${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  // Fullscreen sync
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => undefined);
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => undefined);
    }
  };

  // Camera toggle handler
  const toggleCamera = async () => {
    if (isCameraOn) {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach(t => t.stop());
        cameraStreamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setIsCameraOn(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
          audio: false
        });
        cameraStreamRef.current = stream;
        setIsCameraOn(true);
      } catch (err) {
        console.error('Camera access error:', err);
        setMessages(items => [...items, {
          id: Math.random().toString(),
          sender: 'system',
          text: 'Tidak dapat mengakses kamera. Pastikan izin kamera telah diberikan di browser Anda.'
        }]);
      }
    }
  };

  // Attach camera stream to video element when active
  useEffect(() => {
    if (isCameraOn && videoRef.current && cameraStreamRef.current) {
      videoRef.current.srcObject = cameraStreamRef.current;
    }
  }, [isCameraOn]);

  // Proctoring: record integrity violations (tab switch / losing focus) while interview is active
  useEffect(() => {
    const recordViolation = (reason: string) => {
      if (status === 'Disconnected' || status === 'Connecting') return;
      if (proctorLockRef.current) return;
      proctorLockRef.current = true;
      setTimeout(() => { proctorLockRef.current = false; }, 1500);
      setProctorWarnings(prev => [...prev, { time: new Date().toLocaleTimeString('id-ID'), reason }]);
    };
    const onHide = () => recordViolation('Pindah tab / keluar dari jendela interview');
    const onBlur = () => recordViolation('Beralih ke jendela atau aplikasi lain');
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('blur', onBlur);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('blur', onBlur);
    };
  }, [status]);

  // Warn candidate when integrity violations occur
  useEffect(() => {
    if (proctorWarnings.length === 1) {
      setMessages(items => [...items, {
        id: Math.random().toString(),
        sender: 'system',
        text: 'Peringatan integritas: Anda berpindah jendela. Mohon tetap fokus di layar interview selama sesi berlangsung.'
      }]);
    } else if (proctorWarnings.length === 3) {
      setMessages(items => [...items, {
        id: Math.random().toString(),
        sender: 'system',
        text: 'Peringatan integritas berulang: catatan pelanggaran akan disertakan dalam laporan evaluasi tim HR.'
      }]);
    }
  }, [proctorWarnings.length]);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const response = await axios.get('/api/jobs');
        const jobList = response.data.data || [];
        setJobs(jobList);
        if (jobList.length > 0 && !selectedJob) {
          setSelectedJob(jobList[0]);
        }
      } catch {
        console.error('Gagal mengambil data lowongan');
      } finally {
        setJobsLoading(false);
      }
    };
    fetchJobs();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (processorRef.current) processorRef.current.disconnect();
      if (audioContextInputRef.current) audioContextInputRef.current.close().catch(() => undefined);
      if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      if (cameraStreamRef.current) cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      if (socketRef.current) socketRef.current.close();
      if (audioCtxRef.current) audioCtxRef.current.close().catch(() => undefined);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (aiThinkingTimerRef.current) clearTimeout(aiThinkingTimerRef.current);
    };
  }, []);

  // Sync isSpeaking to ref + auto-resume
  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
    if (isSpeaking) {
      setAiThinking(false);
      if (aiThinkingTimerRef.current) {
        clearTimeout(aiThinkingTimerRef.current);
        aiThinkingTimerRef.current = null;
      }
    }
    if (!isSpeaking && vadStateRef.current === 'awaiting-ai' && socketRef.current?.readyState === WebSocket.OPEN) {
      vadStateRef.current = 'idle';
      vadAudioEndSentRef.current = false;
      socketRef.current.send(JSON.stringify({ type: 'resume' }));
    }
  }, [isSpeaking]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Count questions from AI messages
  useEffect(() => {
    const aiQuestions = messages.filter(m => m.sender === 'ai' && (m.text.includes('?') || m.text.toLowerCase().includes('ceritakan') || m.text.toLowerCase().includes('jelaskan') || m.text.toLowerCase().includes('bagaimana')));
    setQuestionCount(aiQuestions.length);
  }, [messages]);

  const playAudioChunk = (base64Data: string) => {
    const audioCtx = audioCtxRef.current;
    if (!audioCtx) return;

    try {
      const binaryString = window.atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const pcmData = new Int16Array(bytes.buffer);
      const audioBuffer = audioCtx.createBuffer(1, pcmData.length, 24000);
      const channelData = audioBuffer.getChannelData(0);

      for (let i = 0; i < pcmData.length; i++) {
        channelData[i] = pcmData[i] / 32768;
      }

      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);

      // Connect to analyser for output waveform
      if (analyserNode) {
        source.connect(analyserNode);
      }

      const startTime = Math.max(audioCtx.currentTime, nextStartTimeRef.current);
      source.start(startTime);
      nextStartTimeRef.current = startTime + audioBuffer.duration;

      activeSourcesCountRef.current++;
      setIsSpeaking(true);
      isSpeakingRef.current = true;
      if (aiSpeakingCooldownTimerRef.current) {
        clearTimeout(aiSpeakingCooldownTimerRef.current);
        aiSpeakingCooldownTimerRef.current = null;
      }

      source.onended = () => {
        activeSourcesCountRef.current = Math.max(0, activeSourcesCountRef.current - 1);
        if (activeSourcesCountRef.current === 0) {
          // Beri jeda 800ms setelah semua audio chunk selesai diputar agar gema speaker di ruangan hilang tuntas sebelum mic dibuka
          if (aiSpeakingCooldownTimerRef.current) clearTimeout(aiSpeakingCooldownTimerRef.current);
          aiSpeakingCooldownTimerRef.current = setTimeout(() => {
            if (activeSourcesCountRef.current === 0) {
              setIsSpeaking(false);
              isSpeakingRef.current = false;
            }
          }, 800);
        }
      };
    } catch (e) {
      console.error('Error playing audio chunk:', e);
    }
  };

  const connect = async (isReconnect = false) => {
    if (!selectedJob) return;
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const socket = new WebSocket(`${protocol}://${window.location.host}/api/interview/live?voice=${encodeURIComponent(voice)}&language=${encodeURIComponent(language)}&jobTitle=${encodeURIComponent(selectedJob.title)}&jobDescription=${encodeURIComponent(selectedJob.description || '')}&email=${encodeURIComponent(applicantEmail)}`);
    socketRef.current = socket;
    setStatus('Connecting');

    const AudioContextClass = window.AudioContext || ((window as Window & { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext);
    if (!AudioContextClass) return;
    const audioCtx = new AudioContextClass({ sampleRate: 24000 });
    audioCtxRef.current = audioCtx;
    nextStartTimeRef.current = audioCtx.currentTime;

    // Create analyser node for real audio waveform
    const outputAnalyser = audioCtx.createAnalyser();
    outputAnalyser.fftSize = 64;
    outputAnalyser.smoothingTimeConstant = 0.8;
    setAnalyserNode(outputAnalyser);

    if (audioCtx.state === 'suspended') {
      await audioCtx.resume().catch(() => undefined);
    }

    socket.onopen = () => {
      setStatus('Connected');
      setConnectionQuality('good');
      if (isReconnect || isReconnectRef.current) {
        isReconnectRef.current = false;
        setConnectionQuality('unstable');
        setMessages((items) => [...items, { id: Math.random().toString(), sender: 'system', text: 'Koneksi kembali terhubung. Melanjutkan sesi wawancara...' }]);
        socket.send(JSON.stringify({ type: 'text', text: '(Connection re-established. Continue the interview naturally.)' }));
      } else {
        const candidateDisplayName = applicantName || 'Kandidat';
        setMessages((items) => [...items, { id: Math.random().toString(), sender: 'system', text: `Koneksi berhasil terhubung. Memulai sesi wawancara 1-on-1 bersama Ava...` }]);
        socket.send(JSON.stringify({
          type: 'text',
          text: `Halo Ava, saya ${candidateDisplayName} sudah siap untuk wawancara kerja 1-on-1 posisi "${selectedJob?.title || 'pekerjaan'}". Silakan perkenalkan diri Anda secara singkat dan mulai wawancaranya.`
        }));
      }
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'ready') {
        setStatus('Ready');
      }

      if (data.type === 'turnComplete') {
        setAiThinking(false);
      }

      if (data.type === 'candidateText') {
        setMessages((items) => {
          const last = items[items.length - 1];
          if (last && last.sender === 'candidate') {
            return [...items.slice(0, -1), { ...last, text: last.text + ' ' + data.text }];
          } else {
            return [...items, { id: Math.random().toString(), sender: 'candidate', text: data.text }];
          }
        });
      }

      if (data.type === 'aiText') {
        const raw = data.text as string;
        setMessages((items) => {
          const last = items[items.length - 1];
          let clean = raw;
          if (last && last.sender === 'ai') {
            const combined = last.text + clean;
            const phaseMatch = combined.match(PHASE_TOKEN);
            if (phaseMatch) {
              setCurrentPhase(Math.min(parseInt(phaseMatch[1], 10) - 1, PHASE_LABELS.length - 1));
              clean = combined.replace(PHASE_TOKEN, '').trim();
            }
            return [...items.slice(0, -1), { ...last, text: clean }];
          }
          const phaseMatch = clean.match(PHASE_TOKEN);
          if (phaseMatch) {
            setCurrentPhase(Math.min(parseInt(phaseMatch[1], 10) - 1, PHASE_LABELS.length - 1));
            clean = clean.replace(PHASE_TOKEN, '').trim();
          }
          return [...items, { id: Math.random().toString(), sender: 'ai', text: clean }];
        });
        setAiThinking(false);
        setConnectionQuality('good');
        if (aiThinkingTimerRef.current) {
          clearTimeout(aiThinkingTimerRef.current);
          aiThinkingTimerRef.current = null;
        }
      }

      if (data.type === 'error') {
        setMessages((items) => [...items, { id: Math.random().toString(), sender: 'system', text: `Pemberitahuan Sistem: ${data.message}` }]);
      }
      if (data.type === 'audio') {
        playAudioChunk(data.data);
      }
    };

    socket.onclose = () => {
      setStatus('Disconnected');
      setIsSpeaking(false);
      setAiThinking(false);
      setMessages((items) => [...items, { id: Math.random().toString(), sender: 'system', text: 'Koneksi terputus.' }]);

      if (shouldReconnectRef.current && reconnectAttemptRef.current < 5) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 30000);
        reconnectAttemptRef.current++;
        setConnectionQuality('poor');
        setMessages(items => [...items, {
          id: Math.random().toString(),
          sender: 'system',
          text: `Mencoba menghubungkan kembali dalam ${Math.round(delay/1000)} detik... (${reconnectAttemptRef.current}/5)`
        }]);
        reconnectTimerRef.current = setTimeout(() => {
          connect(true);
        }, delay);
      }
    };
  };

  const calcRMS = (data: Float32Array): number => {
    let sumSq = 0;
    for (let i = 0; i < data.length; i++) sumSq += data[i] * data[i];
    return Math.sqrt(sumSq / data.length);
  };

  const startMic = async () => {
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      if (status === 'Disconnected') {
        await connect();
      }
      return;
    }

    try {
      // Hardware noise suppression & echo cancellation
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 16000
        }
      });
      mediaStreamRef.current = stream;

      vadNoiseFloorRef.current = VAD_NOISE_FLOOR_INIT;
      vadLastSpeechMsRef.current = Date.now();
      vadUserWasSpeakingRef.current = false;
      vadStateRef.current = 'idle';
      vadAudioEndSentRef.current = false;
      vadSpeechFramesRef.current = 0;

      const AudioContextClass = window.AudioContext || ((window as Window & { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext);
      if (!AudioContextClass) return;
      const inputContext = new AudioContextClass({ sampleRate: 16000 });
      audioContextInputRef.current = inputContext;

      const source = inputContext.createMediaStreamSource(stream);
      const processor = inputContext.createScriptProcessor(2048, 1, 1);
      processorRef.current = processor;

      // Create input analyser for candidate audio waveform
      const inputAnalyser = inputContext.createAnalyser();
      inputAnalyser.fftSize = 64;
      inputAnalyser.smoothingTimeConstant = 0.8;
      setAnalyserNode(inputAnalyser);

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);

        // Anti-Echo & Mute Guard:
        // Jika mic dinonaktifkan (Mute), ATAU AI sedang bersuara / reverb speaker laptop masih ada, ATAU AI sedang menganalisis:
        // Jangan proses atau streaming audio apapun ke server (mencegah AI mendengar suaranya sendiri)
        if (!isMicOnRef.current || isSpeakingRef.current || isSpeaking || aiThinking) return;

        const energy = calcRMS(inputData);
        const now = Date.now();

        const nf = vadNoiseFloorRef.current;
        if (energy < nf) {
          vadNoiseFloorRef.current = nf * 0.9 + energy * 0.1;
        } else {
          vadNoiseFloorRef.current = nf * 0.999 + energy * 0.001;
        }
        vadNoiseFloorRef.current = Math.max(vadNoiseFloorRef.current, 0.002);

        const threshold = Math.max(vadNoiseFloorRef.current * 3.5, VAD_THRESHOLD);
        const isSpeech = energy > threshold;
        const silenceMs = now - vadLastSpeechMsRef.current;

        if (isSpeech) {
          vadSpeechFramesRef.current++;
          vadLastSpeechMsRef.current = now;
          if (!vadUserWasSpeakingRef.current && vadSpeechFramesRef.current >= 4) {
            vadUserWasSpeakingRef.current = true;
            vadAudioEndSentRef.current = false;
          }
        } else {
          if (vadSpeechFramesRef.current > 0 && silenceMs > 150) {
            vadSpeechFramesRef.current = 0;
          }
        }

        if (!isSpeech && silenceMs > VAD_SHORT_PAUSE_MS) {
          if (vadUserWasSpeakingRef.current && silenceMs > VAD_LONG_PAUSE_MS && !vadAudioEndSentRef.current) {
            vadAudioEndSentRef.current = true;
            vadUserWasSpeakingRef.current = false;
            vadStateRef.current = 'awaiting-ai';
            if (socketRef.current?.readyState === WebSocket.OPEN) {
              socketRef.current.send(JSON.stringify({ type: 'audioEnd' }));
            }
            setAiThinking(true);
            if (aiThinkingTimerRef.current) clearTimeout(aiThinkingTimerRef.current);
            aiThinkingTimerRef.current = setTimeout(() => {
              setAiThinking(false);
              setMessages(items => [...items, {
                id: Math.random().toString(),
                sender: 'system',
                text: 'Belum ada respon audio. Anda dapat mengulangi jawaban atau mengetik di panel pesan.'
              }]);
            }, 30000);
          }
          return;
        }

        // Noise gate: Jangan streaming audio jika kandidat belum/tidak sedang berbicara
        if (!vadUserWasSpeakingRef.current && !isSpeech) {
          return;
        }

        const pcm16 = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcm16[i] = s < 0 ? s * 32768 : s * 32767;
        }

        if (socketRef.current?.readyState === WebSocket.OPEN) {
          const uint8 = new Uint8Array(pcm16.buffer);
          let binary = '';
          for (let i = 0; i < uint8.length; i++) {
            binary += String.fromCharCode(uint8[i]);
          }
          socketRef.current.send(JSON.stringify({
            type: 'audio',
            data: btoa(binary),
            mimeType: 'audio/pcm;rate=16000'
          }));
        }
      };

      source.connect(processor);
      processor.connect(inputContext.destination);

      setIsMicOn(true);
      setStatus('Listening');

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error starting mic:', err);
      setMessages((items) => [...items, { id: Math.random().toString(), sender: 'system', text: `Gagal mengakses mikrofon: ${message}` }]);
    }
  };

  const stopMic = (permanent: boolean = false) => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (audioContextInputRef.current) {
      audioContextInputRef.current.close().catch(() => undefined);
      audioContextInputRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (permanent) {
      socketRef.current?.send(JSON.stringify({ type: 'audioEnd' }));
      setAiThinking(true);
      if (aiThinkingTimerRef.current) clearTimeout(aiThinkingTimerRef.current);
      aiThinkingTimerRef.current = setTimeout(() => {
        setAiThinking(false);
      }, 30000);
      setStatus('Ready');
    } else {
      setStatus('Ready');
    }

    setIsMicOn(false);
    setAnalyserNode(null);
  };

  // Toggle Aktifkan / Nonaktifkan Mikrofon (Mute / Unmute)
  const toggleMicMute = () => {
    if (status === 'Disconnected') {
      connect();
      return;
    }

    if (isMicOn) {
      // Nonaktifkan Mikrofon (Mute)
      setIsMicOn(false);
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getAudioTracks().forEach(track => { track.enabled = false; });
      }
      setAnalyserNode(null);
      setMessages((items) => [
        ...items,
        {
          id: Math.random().toString(),
          sender: 'system',
          text: '🔇 Mikrofon dinonaktifkan (suara sekitar tidak didengar Ava). Waktu wawancara tetap berjalan.'
        }
      ]);
    } else {
      // Aktifkan Mikrofon (Unmute)
      setIsMicOn(true);
      if (mediaStreamRef.current && mediaStreamRef.current.getAudioTracks().length > 0) {
        mediaStreamRef.current.getAudioTracks().forEach(track => { track.enabled = true; });
        if (audioContextInputRef.current) {
          const analyser = audioContextInputRef.current.createAnalyser();
          analyser.fftSize = 64;
          analyser.smoothingTimeConstant = 0.8;
          setAnalyserNode(analyser);
        }
      } else {
        startMic();
      }
      setMessages((items) => [
        ...items,
        {
          id: Math.random().toString(),
          sender: 'system',
          text: '🎙️ Mikrofon aktif. Silakan berbicara kepada Ava.'
        }
      ]);
    }
  };

  // Selesai bicara manual (opsional, untuk bypass hening VAD saat lingkungan berisik)
  const handleFinishTurn = () => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'audioEnd' }));
    }
    vadUserWasSpeakingRef.current = false;
    vadAudioEndSentRef.current = true;
    vadSpeechFramesRef.current = 0;
    setAiThinking(true);
    setMessages((items) => [
      ...items,
      {
        id: Math.random().toString(),
        sender: 'system',
        text: 'Jawaban dikirim. Ava sedang menganalisis respons Anda...'
      }
    ]);
  };

  const sendText = () => {
    if (!text.trim() || socketRef.current?.readyState !== WebSocket.OPEN) return;
    socketRef.current.send(JSON.stringify({ type: 'text', text }));
    setMessages((items) => [...items, { id: Math.random().toString(), sender: 'candidate', text }]);
    setText('');
  };

  const formatTranscript = (msgs: ChatMessage[]): string => {
    return msgs
      .filter(m => m.sender === 'candidate' || m.sender === 'ai')
      .map(m => {
        const label = m.sender === 'candidate' ? 'Candidate' : 'Ava (HR AI)';
        return `[${label}] ${m.text}`;
      })
      .join('\n\n');
  };

  const generateSummary = (msgs: ChatMessage[]): string => {
    const candidateMsgs = msgs.filter(m => m.sender === 'candidate');
    const aiMsgs = msgs.filter(m => m.sender === 'ai');
    const totalExchanges = Math.min(candidateMsgs.length, aiMsgs.length);
    const totalChars = msgs.reduce((acc, m) => acc + m.text.length, 0);
    return `Wawancara selesai. Total ${totalExchanges} sesi tanya-jawab, ${totalChars} karakter percakapan.`;
  };

  const saveInterviewResult = async () => {
    if (!applicantEmail || messages.length === 0) return;
    setSaveStatus('saving');
    try {
      const transcript = formatTranscript(messages);
      const summary = generateSummary(messages);
      await axios.post('/api/interview/save', {
        email: applicantEmail,
        transcript,
        summary,
        proctor: {
          violations: proctorWarnings,
          flagged: proctorWarnings.length > 0,
          durationSec: elapsed
        }
      });
      setSaveStatus('saved');
      fetchReport();
    } catch (err: unknown) {
      setSaveStatus('error');
      const msg = axios.isAxiosError(err) ? err.response?.data?.error || err.message : 'Gagal menyimpan hasil wawancara';
      setSaveError(typeof msg === 'string' ? msg : 'Gagal menyimpan hasil wawancara');
      console.error('Save interview error:', err);
    }
  };

  const fetchReport = async (attempt = 0) => {
    if (!applicantEmail) return;
    setReportLoading(true);
    try {
      const response = await axios.get('/api/interview/result', { params: { email: applicantEmail } });
      const d = response.data.data;
      if (d && (d.interviewStatus === 'scored' || d.interviewScore !== null) && d.skillMatrix) {
        setReport(d);
        setReportLoading(false);
        return;
      }
      if (attempt < 15) {
        setTimeout(() => fetchReport(attempt + 1), 3000);
      } else {
        setReportLoading(false);
      }
    } catch {
      if (attempt < 15) {
        setTimeout(() => fetchReport(attempt + 1), 3000);
      } else {
        setReportLoading(false);
      }
    }
  };

  const handleVerifyEmail = async () => {
    if (!emailInput.trim()) return;
    setEmailError('');
    setApplicantName('');
    setEmailLoading(true);
    try {
      const response = await axios.get('/api/applicants/check-email', {
        params: { email: emailInput.trim() }
      });
      if (response.data.found) {
        const { fullName, appliedPosition, jobId } = response.data.data;
        setApplicantName(fullName);
        setEmailError('');

        // Auto-select applied position if matched in job list
        if (jobId) {
          const matched = jobs.find(j => j.id === jobId);
          if (matched) setSelectedJob(matched);
        } else if (appliedPosition) {
          const matched = jobs.find(j => j.title.toLowerCase() === appliedPosition.toLowerCase());
          if (matched) setSelectedJob(matched);
        }

        setTimeout(() => {
          setApplicantEmail(emailInput.trim());
        }, 800);
      }
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        setEmailError('Email tidak terdaftar. Silakan daftar terlebih dahulu melalui formulir pendaftaran.');
      } else {
        const msg = axios.isAxiosError(err) ? err.response?.data?.error || err.message : 'Gagal memvalidasi email';
        setEmailError(typeof msg === 'string' ? msg : 'Terjadi kesalahan saat memvalidasi email');
      }
      setApplicantName('');
    } finally {
      setEmailLoading(false);
    }
  };

  const generateInterviewSummary = useCallback(() => {
    const candidateMsgs = messages.filter(m => m.sender === 'candidate');
    const aiMsgs = messages.filter(m => m.sender === 'ai');
    const totalChars = messages.reduce((acc, m) => acc + m.text.length, 0);
    const exchanges = Math.min(candidateMsgs.length, aiMsgs.length);

    setInterviewStats({
      totalQuestions: aiMsgs.filter(m => m.text.includes('?') || m.text.includes('bagaimana') || m.text.includes('ceritakan')).length,
      totalAnswers: candidateMsgs.length,
      totalChars,
      duration: elapsed,
      exchanges
    });
    setShowSummary(true);
  }, [messages, elapsed]);

  const disconnect = async () => {
    shouldReconnectRef.current = false;
    stopMic(true);

    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(t => t.stop());
      cameraStreamRef.current = null;
    }
    setIsCameraOn(false);

    if (applicantEmail && messages.length > 0) {
      await saveInterviewResult();
    }

    if (socketRef.current) {
      socketRef.current.close();
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => undefined);
      audioCtxRef.current = null;
    }
    setIsSpeaking(false);
    setAnalyserNode(null);

    if (messages.length > 0) {
      generateInterviewSummary();
    }
  };

  const restartInterview = () => {
    setShowSummary(false);
    setShowWelcome(true);
    setMessages([]);
    setElapsed(0);
    setQuestionCount(0);
    setStatus('Disconnected');
    setIsSpeaking(false);

    setSaveStatus('idle');
    setSaveError('');
    setCurrentPhase(0);
    setProctorWarnings([]);
    setReport(null);
    setReportLoading(false);
  };

  const isActive = status !== 'Disconnected' && status !== 'Connecting';
  const totalDuration = selectedJob?.interviewDuration ? selectedJob.interviewDuration * 60 : null;
  const progressPercent = totalDuration ? Math.min((elapsed / totalDuration) * 100, 100) : null;
  const timeRemaining = totalDuration ? Math.max(totalDuration - elapsed, 0) : null;

  // ==========================================
  // PRE-INTERVIEW SCREEN (Email verification & Job Selection)
  // ==========================================
  if (!applicantEmail) {
    return (
      <div id="main-content" className="min-h-screen bg-[#f0f4f8] flex items-center justify-center p-4">
        {/* Background decorative shapes */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#14b8a6]/5 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#f97316]/5 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3" />
        </div>
        <div className="relative z-10 w-full max-w-md">
          {/* Logo & heading */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#14b8a6] to-[#0d9488] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#14b8a6]/25">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-800 font-heading">AI HR Interview</h1>
            <p className="text-slate-500 mt-2 text-sm">Pilih posisi yang dilamar dan masukkan email terdaftar Anda untuk memulai</p>
          </div>

          {/* Card */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/50 p-7 space-y-5">
            {/* Job Selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Posisi yang Dilamar</label>
              <div className="relative">
                <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <select
                  value={selectedJob?.id || ''}
                  onChange={(e) => {
                    const job = jobs.find(j => j.id === e.target.value) || null;
                    setSelectedJob(job);
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm font-semibold text-slate-700 focus:outline-none focus:border-[#14b8a6] focus:ring-2 focus:ring-[#14b8a6]/20 transition-all cursor-pointer"
                >
                  {jobsLoading ? (
                    <option value="">Memuat lowongan...</option>
                  ) : (
                    jobs.map((job) => (
                      <option key={job.id} value={job.id}>{job.title}</option>
                    ))
                  )}
                </select>
              </div>
              {selectedJob?.description && (
                <div className="mt-2 bg-slate-50 border border-slate-100 rounded-lg p-2.5 max-h-20 overflow-y-auto">
                  <p className="text-[11px] text-slate-500 leading-relaxed">{selectedJob.description}</p>
                </div>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Email Pendaftaran</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value);
                    if (emailError) setEmailError('');
                    if (applicantName) setApplicantName('');
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && emailInput.trim()) handleVerifyEmail(); }}
                  placeholder="nama@email.com"
                  className={`w-full bg-slate-50 border rounded-xl pl-10 pr-4 py-3 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 transition-all ${
                    emailError ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-[#14b8a6] focus:ring-[#14b8a6]/20'
                  }`}
                />
              </div>
              {emailError && (
                <div className="mt-2 flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-red-600 leading-relaxed">{emailError}</p>
                </div>
              )}
              {applicantName && !emailError && (
                <div className="mt-2 flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  <p className="text-[11px] text-emerald-700">
                    Terverifikasi! Selamat datang, <span className="font-bold">{applicantName}</span>
                  </p>
                </div>
              )}
            </div>

            {/* Voice & Language Settings */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Suara Pewawancara</label>
                <select
                  value={voice}
                  onChange={(e) => setVoice(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#14b8a6]"
                >
                  {voices.map(v => <option key={v} value={v}>{v} Voice</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Bahasa</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#14b8a6]"
                >
                  {languages.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>

            {/* Job Config Details */}
            {selectedJob && (selectedJob.interviewDuration || selectedJob.interviewPassingScore !== null) && (
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center justify-around">
                {selectedJob.interviewDuration && (
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Clock className="w-3.5 h-3.5 text-[#14b8a6]" />
                    <span>Durasi: {selectedJob.interviewDuration} menit</span>
                  </div>
                )}
                {selectedJob.interviewPassingScore !== null && (
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Target className="w-3.5 h-3.5 text-[#f97316]" />
                    <span>Passing: {selectedJob.interviewPassingScore}%</span>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleVerifyEmail}
              disabled={!emailInput.trim() || !selectedJob || emailLoading}
              className="w-full py-3.5 rounded-xl font-bold text-sm transition-all duration-300 bg-gradient-to-r from-[#14b8a6] to-[#0d9488] hover:shadow-lg hover:shadow-[#14b8a6]/30 text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {emailLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Memvalidasi Akun...</>
              ) : (
                <>Lanjut ke Ruang Interview <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </div>

          <div className="text-center mt-6">
            <Link to="/" className="text-xs text-slate-400 hover:text-slate-600 transition-colors inline-flex items-center gap-1 font-medium">
              <ChevronLeft className="w-4 h-4" /> Kembali ke Beranda
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // WELCOME SCREEN / ONBOARDING OVERLAY
  // ==========================================
  if (showWelcome && !isActive) {
    return (
      <div id="main-content" className="min-h-screen bg-[#f0f4f8] flex items-center justify-center p-4">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#14b8a6]/5 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#f97316]/5 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3" />
        </div>
        <div className="relative z-10 w-full max-w-lg">
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {welcomeSteps.map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all duration-300 ${
                i === welcomeStep ? 'w-8 bg-[#14b8a6]' : i < welcomeStep ? 'w-4 bg-[#14b8a6]/40' : 'w-4 bg-slate-200'
              }`} />
            ))}
          </div>

          {/* Step card */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/50 p-8 text-center animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#14b8a6] to-[#0d9488] flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#14b8a6]/25">
              <div className="text-white">{welcomeSteps[welcomeStep].icon}</div>
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">{welcomeSteps[welcomeStep].title}</h2>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">{welcomeSteps[welcomeStep].description}</p>

            {/* Tips list */}
            <div className="bg-slate-50 rounded-2xl p-4 mb-6 text-left border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Tips Persiapan</p>
              <ul className="space-y-2">
                {welcomeSteps[welcomeStep].tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-slate-600">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#14b8a6] flex-shrink-0 mt-0.5" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center gap-3">
              {welcomeStep > 0 && (
                <button
                  onClick={() => setWelcomeStep(s => s - 1)}
                  className="flex-1 py-3 rounded-xl font-semibold text-sm border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
                >
                  Kembali
                </button>
              )}
              <button
                onClick={() => {
                  if (welcomeStep < welcomeSteps.length - 1) {
                    setWelcomeStep(s => s + 1);
                  } else {
                    setShowWelcome(false);
                  }
                }}
                className="flex-1 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-[#14b8a6] to-[#0d9488] text-white hover:shadow-lg hover:shadow-[#14b8a6]/30 transition-all flex items-center justify-center gap-2"
              >
                {welcomeStep < welcomeSteps.length - 1 ? (
                  <>Selanjutnya <ArrowRight className="w-4 h-4" /></>
                ) : (
                  <>Mulai Interview <Zap className="w-4 h-4" /></>
                )}
              </button>
            </div>
          </div>

          <div className="text-center mt-6">
            <button onClick={() => setShowWelcome(false)} className="text-xs text-slate-400 hover:text-slate-600 transition-colors font-semibold">
              Lewati panduan & langsung ke ruangan →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // END INTERVIEW SUMMARY & FULL AI REPORT SCREEN
  // ==========================================
  if (showSummary) {
    const recMatch = report?.interviewResult?.match(/Rekomendasi:\s*(\w+)/);
    const recommendation = recMatch ? recMatch[1] : null;
    const recLabel: Record<string, { text: string; cls: string }> = {
      strong_accept: { text: 'Sangat Direkomendasikan', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
      accept: { text: 'Direkomendasikan', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
      consider: { text: 'Pertimbangkan', cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
      reject: { text: 'Tidak Direkomendasikan', cls: 'bg-rose-50 text-rose-700 ring-rose-200' },
      strong_reject: { text: 'Tidak Direkomendasikan', cls: 'bg-rose-50 text-rose-700 ring-rose-200' },
    };
    const rec = recommendation ? (recLabel[recommendation] || recLabel.consider) : null;
    const t = report?.interviewResult || '';
    const idx = t.indexOf('\n\n');
    const reportSummary = idx >= 0 ? t.slice(idx + 2).split('\n\n')[0] : t;
    const passed = (report && report.passingScore !== null && report.interviewScore !== null)
      ? report.interviewScore >= report.passingScore
      : null;

    return (
      <div id="main-content" className="min-h-screen bg-[#f0f4f8] py-8 px-4 flex flex-col items-center">
        {/* Background ambient elements */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#14b8a6]/5 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#f97316]/5 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3" />
        </div>

        <div className="relative z-10 w-full max-w-3xl space-y-6 animate-slide-up">
          {/* Header Banner */}
          <div className="text-center pt-2">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#14b8a6] to-[#0d9488] flex items-center justify-center mx-auto mb-3 shadow-lg shadow-[#14b8a6]/25">
              <Award className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-extrabold text-slate-800 font-heading">Sesi Wawancara Selesai!</h1>
            <p className="text-slate-500 text-xs mt-1">
              Terima kasih telah berpartisipasi, <span className="font-semibold text-slate-700">{applicantName || applicantEmail}</span>. Berikut laporan evaluasi AI Anda.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 text-center shadow-sm">
              <Clock className="w-5 h-5 text-[#14b8a6] mx-auto mb-1.5" />
              <p className="text-xl font-bold text-slate-800 font-mono">{formatTime(interviewStats.duration)}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Durasi</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 text-center shadow-sm">
              <Target className="w-5 h-5 text-[#f97316] mx-auto mb-1.5" />
              <p className="text-xl font-bold text-slate-800">{interviewStats.exchanges}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tanya Jawab</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 text-center shadow-sm">
              <MessageCircle className="w-5 h-5 text-blue-500 mx-auto mb-1.5" />
              <p className="text-xl font-bold text-slate-800">{interviewStats.totalAnswers}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Respons Anda</p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 text-center shadow-sm">
              <Sparkles className="w-5 h-5 text-purple-500 mx-auto mb-1.5" />
              <p className="text-xl font-bold text-slate-800">{interviewStats.totalChars.toLocaleString()}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Karakter</p>
            </div>
          </div>

          {/* Status Message */}
          {saveStatus === 'saved' && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <p className="text-xs font-semibold text-emerald-700">Hasil dan transkrip wawancara tersimpan aman ke basis data.</p>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100/60 px-2 py-0.5 rounded-full">Tersimpan</span>
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-xs font-semibold text-red-700">{saveError || 'Gagal menyimpan hasil wawancara.'}</p>
              </div>
              <button onClick={saveInterviewResult} className="text-xs font-bold text-[#14b8a6] hover:underline">
                Coba Lagi
              </button>
            </div>
          )}

          {/* Proctoring integrity alert if any */}
          {proctorWarnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-800">Catatan Integritas Sesi ({proctorWarnings.length} peringatan)</p>
                <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                  Terdeteksi aktivitas pergantian tab atau jendela selama wawancara. Riwayat ini akan ditinjau manual oleh tim HR bersama transkrip jawaban.
                </p>
              </div>
            </div>
          )}

          {/* AI EVALUATION REPORT SECTION */}
          {reportLoading ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-10 shadow-sm text-center space-y-4">
              <div className="relative w-16 h-16 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-[#14b8a6]/20 border-t-[#14b8a6] animate-spin" />
                <div className="w-full h-full rounded-full flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-[#14b8a6] animate-pulse" />
                </div>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-800">AI Sedang Menyusun Laporan Penilaian...</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
                  Ava sedang menganalisis transkrip percakapan, mengukur penguasaan kompetensi, dan menghitung matriks evaluasi. Hasil akan muncul otomatis.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-50 border border-slate-100 text-[11px] text-slate-500 font-medium">
                <Loader2 className="w-3 h-3 animate-spin text-[#14b8a6]" />
                Sinkronisasi data penilaian Gemini AI...
              </div>
            </div>
          ) : report && report.interviewScore !== null ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md p-6 sm:p-8 space-y-6">
              {/* Score Highlight Header */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-100">
                <div className="space-y-2 text-center sm:text-left">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 text-[#0d9488] text-[10px] font-bold border border-teal-200/60">
                    <Sparkles className="w-3 h-3" /> Laporan Penilaian Wawancara AI
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-800 font-heading">
                    {selectedJob?.title || report.appliedPosition || 'Evaluasi Kompetensi'}
                  </h2>
                  <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap pt-1">
                    {rec && (
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ring-1 ${rec.cls}`}>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> {rec.text}
                      </span>
                    )}
                    {passed !== null && (
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ring-1 ${
                        passed ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-rose-50 text-rose-700 ring-rose-200'
                      }`}>
                        {passed ? '✓ Memenuhi Syarat Kelulusan' : '✗ Di Bawah Nilai Kelulusan'} (Min. {report.passingScore}%)
                      </span>
                    )}
                    {report.screeningScore !== null && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ring-1 bg-blue-50 text-blue-700 ring-blue-200">
                        Skor CV: {report.screeningScore}%
                      </span>
                    )}
                  </div>
                </div>

                {/* Score Dial */}
                <div className="text-center flex-shrink-0">
                  <div className={`w-28 h-28 rounded-3xl flex flex-col items-center justify-center ring-4 shadow-xl transition-all ${
                    report.interviewScore >= 75
                      ? 'ring-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-700 shadow-emerald-500/10'
                      : report.interviewScore >= 60
                        ? 'ring-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 text-amber-700 shadow-amber-500/10'
                        : 'ring-rose-200 bg-gradient-to-br from-rose-50 to-red-50 text-rose-700 shadow-rose-500/10'
                  }`}>
                    <span className="text-4xl font-extrabold font-heading tabular-nums">{report.interviewScore}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Skor / 100</span>
                  </div>
                </div>
              </div>

              {/* Assessment Summary Paragraph */}
              {reportSummary && (
                <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-[#14b8a6]" /> Ringkasan Analisis AI
                  </p>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">{reportSummary}</p>
                </div>
              )}

              {/* Radar Chart & Competencies Grid */}
              {report.skillMatrix && report.skillMatrix.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center pt-2">
                  <div className="flex flex-col items-center">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">
                      Diagram Radar Kompetensi
                    </p>
                    <RadarChart
                      axes={report.skillMatrix.map(s => ({ label: s.skill, value: s.score }))}
                      size={280}
                    />
                  </div>

                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Rincian Penilaian per Dimensi
                    </p>
                    {report.skillMatrix.map((s, i) => (
                      <div key={i} className="bg-slate-50/70 rounded-xl p-3 border border-slate-100 shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-bold text-slate-700">{s.skill}</span>
                          <span className={`text-xs font-extrabold tabular-nums ${
                            s.score >= 75 ? 'text-emerald-600' : s.score >= 60 ? 'text-amber-600' : 'text-rose-600'
                          }`}>
                            {s.score}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden mb-1.5">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${
                              s.score >= 75 ? 'bg-emerald-500' : s.score >= 60 ? 'bg-amber-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${s.score}%` }}
                          />
                        </div>
                        {s.notes && <p className="text-[11px] text-slate-500 leading-relaxed">{s.notes}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Phase Scores & Question Details */}
              {report.phases && report.phases.length > 0 && (
                <div className="pt-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">
                    Evaluasi per Fase Wawancara
                  </p>
                  <div className="grid grid-cols-1 gap-3">
                    {report.phases.map((phase, pi) => (
                      <div key={pi} className="bg-slate-50 rounded-2xl border border-slate-100 p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800">
                            Fase {pi + 1}: {phase.name}
                          </span>
                          <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                            phase.score >= 75 ? 'bg-emerald-100 text-emerald-800' : phase.score >= 60 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            Skor: {phase.score}%
                          </span>
                        </div>
                        {phase.questions && phase.questions.length > 0 && (
                          <div className="space-y-1.5 pt-1 border-t border-slate-200/50">
                            {phase.questions.map((q, qi) => (
                              <div key={qi} className="flex items-start gap-2.5 text-xs text-slate-600">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0 ${
                                  q.score >= 75 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'
                                }`}>
                                  {q.score}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-slate-700">{q.question}</p>
                                  {q.note && <p className="text-[10px] text-slate-400 mt-0.5">{q.note}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Print action bar */}
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                >
                  <Printer className="w-3.5 h-3.5" /> Cetak / Simpan PDF Laporan
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-700">Menunggu Penilaian AI</p>
                <p className="text-xs text-slate-400 mt-0.5">AI sedang memproses transkrip Anda di latar belakang.</p>
              </div>
              <button
                onClick={() => fetchReport()}
                className="px-4 py-2 bg-[#14b8a6] text-white rounded-xl text-xs font-bold hover:bg-[#0d9488] transition-all flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Muat Ulang Hasil
              </button>
            </div>
          )}

          {/* Transcript Accordion */}
          {messages.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
              <button
                onClick={() => setShowTranscriptDetails(!showTranscriptDetails)}
                className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-[#14b8a6]" />
                  <span className="text-xs font-bold text-slate-700">Transkrip Lengkap Percakapan ({messages.length} pesan)</span>
                </div>
                {showTranscriptDetails ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </button>

              {showTranscriptDetails && (
                <div className="p-5 border-t border-slate-100 max-h-60 overflow-y-auto space-y-2.5 font-mono text-xs bg-slate-50/50">
                  {messages.map((m) => (
                    <div key={m.id} className="flex gap-2">
                      <span className={`font-bold text-[10px] uppercase w-16 flex-shrink-0 ${m.sender === 'ai' ? 'text-[#0d9488]' : m.sender === 'candidate' ? 'text-blue-600' : 'text-slate-400'}`}>
                        {m.sender === 'ai' ? 'Ava' : m.sender === 'candidate' ? 'Anda' : 'System'}:
                      </span>
                      <span className="text-slate-700 leading-relaxed">{m.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Navigation Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={restartInterview}
              className="flex-1 py-3.5 rounded-xl font-bold text-xs sm:text-sm border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Ulangi Sesi Wawancara
            </button>
            <Link
              to="/"
              className="flex-1 py-3.5 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-[#14b8a6] to-[#0d9488] text-white hover:shadow-lg hover:shadow-[#14b8a6]/30 transition-all flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" /> Selesai & Kembali ke Beranda
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // MAIN INTERVIEW ROOM — Full Video Call Layout
  // ==========================================
  return (
    <div id="main-content" className="h-screen overflow-hidden bg-[#f0f4f8] text-slate-800 flex flex-col">

      {/* ─── Top Header Bar ─── */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-5 flex-shrink-0 z-20">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/" className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors flex-shrink-0">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#14b8a6] to-[#0d9488] flex items-center justify-center shadow-sm flex-shrink-0">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-slate-800 truncate">
              {selectedJob?.title || 'AI Interview'} — {applicantName || applicantEmail}
            </h1>
            <div className="flex items-center gap-2.5 mt-0.5">
              {selectedJob && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#0d9488] bg-[#14b8a6]/10 px-2 py-0.5 rounded-full">
                  <Briefcase className="w-3 h-3" /> {selectedJob.title}
                </span>
              )}
              <span className="text-[10px] text-slate-400 truncate">{applicantEmail}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Recording Timer Indicator */}
          {isActive && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 border border-red-100">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-mono font-bold text-red-600">{formatTime(elapsed)}</span>
            </div>
          )}

          {/* Status Badge */}
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
            status === 'Disconnected'
              ? 'bg-slate-100 text-slate-500'
              : !isMicOn
                ? 'bg-red-50 text-red-600 border border-red-200'
                : status === 'Listening'
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                  : isSpeaking
                    ? 'bg-blue-50 text-blue-600 border border-blue-100'
                    : 'bg-[#14b8a6]/10 text-[#0d9488] border border-[#14b8a6]/20'
          }`}>
            <div className={`w-1.5 h-1.5 rounded-full ${
              status === 'Disconnected' ? 'bg-slate-400' :
              !isMicOn ? 'bg-red-400' :
              'bg-[#14b8a6] animate-pulse'
            }`} />
            {!isMicOn ? 'Mic Nonaktif' : status === 'Listening' ? 'Mendengarkan' : status === 'Ready' ? 'Siap' : status}
          </div>

          {/* Connection Quality */}
          {isActive && (
            <div className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
              connectionQuality === 'good' ? 'bg-emerald-50 text-emerald-600' : connectionQuality === 'unstable' ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${
                connectionQuality === 'good' ? 'bg-emerald-500' : connectionQuality === 'unstable' ? 'bg-amber-500' : 'bg-red-500 animate-pulse'
              }`} />
              {connectionQuality === 'good' ? 'Koneksi Stabil' : connectionQuality === 'unstable' ? 'Tidak Stabil' : 'Putus'}
            </div>
          )}

          {/* Proctoring integrity warnings badge */}
          {proctorWarnings.length > 0 && (
            <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200" title="Pelanggaran integritas terdeteksi">
              <AlertTriangle className="w-3.5 h-3.5" />
              {proctorWarnings.length} Flag
            </div>
          )}
        </div>
      </header>

      {/* ─── Progress Bar (Active Sessions) ─── */}
      {isActive && (
        <div className="flex-shrink-0 bg-white border-b border-slate-200 px-5 py-2 z-10">
          <div className="flex items-center gap-4">
            {progressPercent !== null && (
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-bold text-slate-500">Progres Sesi</span>
                  <span className="text-[10px] font-bold text-slate-400 font-mono">{formatTime(elapsed)} / {formatTime(totalDuration!)}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${
                      progressPercent > 80 ? 'bg-gradient-to-r from-red-400 to-red-500' :
                      progressPercent > 50 ? 'bg-gradient-to-r from-amber-400 to-amber-500' :
                      'bg-gradient-to-r from-[#14b8a6] to-[#0d9488]'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            )}

            {timeRemaining !== null && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-50 border border-slate-100">
                <Clock className="w-3 h-3 text-slate-400" />
                <span className={`text-xs font-mono font-bold ${timeRemaining < 120 ? 'text-red-500' : 'text-slate-600'}`}>
                  {formatTime(timeRemaining)}
                </span>
              </div>
            )}

            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-50 border border-slate-100">
              <MessageCircle className="w-3 h-3 text-slate-400" />
              <span className="text-xs font-bold text-slate-600">{questionCount} Pertanyaan</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── Body: Sidebar + Stage + Right Panel ─── */}
      <div className="flex-1 flex min-h-0 relative">

        {/* ─── Left Icon Sidebar ─── */}
        <aside className="flex-shrink-0 bg-white border-r border-slate-200 flex flex-col items-center py-4 gap-1.5 w-16 z-10">
          <Link to="/" className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors mb-1" title="Beranda">
            <Home className="w-5 h-5" />
          </Link>

          {/* Video / Camera Toggle */}
          <button
            onClick={toggleCamera}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              isCameraOn
                ? 'bg-emerald-50 text-emerald-600 ring-2 ring-emerald-300'
                : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
            }`}
            title={isCameraOn ? 'Matikan Kamera' : 'Nyalakan Kamera'}
          >
            {isCameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          {/* Chat Tab */}
          <button
            onClick={() => setRightTab('messages')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors relative ${
              rightTab === 'messages' ? 'bg-[#14b8a6]/10 text-[#0d9488]' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
            }`}
            title="Percakapan"
          >
            <MessageSquare className="w-5 h-5" />
            {messages.filter(m => m.sender === 'ai').length > 0 && rightTab !== 'messages' && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#14b8a6]" />
            )}
          </button>

          {/* Stats Tab */}
          <button
            onClick={() => setRightTab('stats')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              rightTab === 'stats' ? 'bg-[#14b8a6]/10 text-[#0d9488]' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
            }`}
            title="Statistik Sesi & Fase"
          >
            <BarChart3 className="w-5 h-5" />
          </button>

          {/* Info Tab */}
          <button
            onClick={() => setRightTab('info')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              rightTab === 'info' ? 'bg-[#14b8a6]/10 text-[#0d9488]' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
            }`}
            title="Informasi Posisi & Peserta"
          >
            <Users className="w-5 h-5" />
          </button>

          {/* Tips Tab */}
          <button
            onClick={() => setRightTab('tips')}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              rightTab === 'tips' ? 'bg-[#14b8a6]/10 text-[#0d9488]' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
            }`}
            title="Panduan & Tips Wawancara"
          >
            <HelpCircle className="w-5 h-5" />
          </button>

          {/* Notifications Popover Toggle */}
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors relative ${
              showNotifications ? 'bg-amber-50 text-amber-600' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
            }`}
            title="Notifikasi & Peringatan"
          >
            <Bell className="w-5 h-5" />
            {proctorWarnings.length > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500" />
            )}
          </button>

          <div className="flex-1" />

          {/* Settings */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
              showSettings ? 'bg-[#14b8a6]/10 text-[#0d9488]' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
            }`}
            title="Pengaturan"
          >
            <Settings className="w-5 h-5" />
          </button>
        </aside>

        {/* ─── Center Stage ─── */}
        <main className="flex-1 flex flex-col min-w-0 relative bg-page-bg">

          {/* Notifications Dropdown Overlay */}
          {showNotifications && (
            <div className="absolute top-3 left-4 z-30 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 animate-slide-up">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-[#14b8a6]" /> Notifikasi & Status Sesi
                </h4>
                <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2 mt-3 max-h-60 overflow-y-auto">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                  <p className="font-bold text-slate-700">Koneksi Gemini Live AI</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Model Ava aktif ({voice} voice, bahasa {language}).</p>
                </div>
                {proctorWarnings.length === 0 ? (
                  <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-100 text-xs text-emerald-700 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    <span>Integritas sesi terjaga. Belum ada catatan pelanggaran.</span>
                  </div>
                ) : (
                  proctorWarnings.map((w, idx) => (
                    <div key={idx} className="bg-red-50 p-2.5 rounded-xl border border-red-100 text-xs text-red-700">
                      <p className="font-bold">{w.reason}</p>
                      <p className="text-[10px] text-red-400 mt-0.5">{w.time}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Settings Dropdown Overlay */}
          {showSettings && (
            <div className="absolute top-3 left-3 right-3 z-30 bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 animate-slide-up">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-800">Pengaturan Sesi Wawancara</h3>
                <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-slate-600 text-xs font-bold">
                  ✕ Tutup
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1.5">Suara Pewawancara (Ava)</label>
                  <select
                    value={voice}
                    onChange={(e) => setVoice(e.target.value)}
                    disabled={isActive}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#14b8a6] disabled:opacity-50"
                  >
                    {voices.map((item) => <option key={item} value={item}>{item} Voice</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1.5">Bahasa Wawancara</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    disabled={isActive}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#14b8a6] disabled:opacity-50"
                  >
                    {languages.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 block mb-1.5">Posisi Lamaran</label>
                  <select
                    value={selectedJob?.id || ''}
                    onChange={(e) => {
                      const job = jobs.find(j => j.id === e.target.value) || null;
                      setSelectedJob(job);
                    }}
                    disabled={isActive}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#14b8a6] disabled:opacity-50"
                  >
                    {jobs.map((job) => (
                      <option key={job.id} value={job.id}>{job.title}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Main Video / AI Avatar Center Stage */}
          <div className="flex-1 flex items-center justify-center p-4 sm:p-6 min-h-0">
            <div className="relative w-full max-w-3xl aspect-video bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col items-center justify-center">

              {/* Ambient Background Lighting Rings */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className={`absolute w-36 h-36 border-2 rounded-full transition-all duration-500 ${
                  aiThinking ? 'border-purple-400/40 scale-125 animate-pulse' :
                  isSpeaking ? 'border-[#14b8a6]/40 scale-125 animate-pulse' :
                  status === 'Listening' ? 'border-blue-400/40 scale-110' :
                  'border-white/5'
                }`} />
                <div className={`absolute w-56 h-56 border rounded-full transition-all duration-700 ${
                  aiThinking ? 'border-purple-400/20 scale-125' :
                  isSpeaking ? 'border-[#14b8a6]/20 scale-125' :
                  'border-white/5'
                }`} />
                <div className={`absolute w-80 h-80 border rounded-full transition-all duration-1000 ${
                  aiThinking ? 'border-purple-400/10 scale-115' :
                  isSpeaking ? 'border-[#14b8a6]/10 scale-115' :
                  'border-white/5'
                }`} />
              </div>

              {/* Avatar Icon */}
              <div className={`relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl ${
                status === 'Listening' && isMicOn
                  ? 'bg-gradient-to-br from-blue-400 to-blue-600 shadow-blue-500/40 scale-105'
                  : !isMicOn
                    ? 'bg-gradient-to-br from-slate-600 to-slate-700 shadow-slate-500/30'
                    : aiThinking
                      ? 'bg-gradient-to-br from-purple-500 to-indigo-600 shadow-purple-500/40 animate-pulse'
                      : isSpeaking
                        ? 'bg-gradient-to-br from-[#14b8a6] to-[#0d9488] shadow-[#14b8a6]/50 scale-105'
                        : 'bg-gradient-to-br from-slate-700 to-slate-800 border border-slate-600'
              }`}>
                {!isMicOn ? (
                  <MicOff className="w-10 h-10 text-red-300" />
                ) : aiThinking ? (
                  <Loader2 className="w-10 h-10 text-white animate-spin" />
                ) : isSpeaking ? (
                  <Volume2 className="w-10 h-10 text-white animate-bounce" />
                ) : status === 'Listening' ? (
                  <Mic className="w-10 h-10 text-white animate-pulse" />
                ) : (
                  <Zap className="w-10 h-10 text-teal-400" />
                )}
              </div>

              {/* Audio Waveform with Real Analyser Node */}
              <div className="relative z-10 w-full max-w-md mt-4 px-8">
                <AudioWaveform
                  isPlaying={isSpeaking}
                  isRecording={status === 'Listening' && isMicOn}
                  analyserNode={isMicOn ? analyserNode : null}
                  height={50}
                  barCount={44}
                  color={isSpeaking ? '#14b8a6' : status === 'Listening' && isMicOn ? '#38bdf8' : '#94a3b8'}
                  inactiveColor="rgba(255,255,255,0.1)"
                />
              </div>

              {/* AI Persona Identity Badge */}
              <div className="relative z-10 flex items-center gap-2 mt-2">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#14b8a6] to-[#0d9488] text-white text-[10px] font-bold shadow-md shadow-[#14b8a6]/25">
                  <Zap className="w-3 h-3" /> Virtual Recruiter
                </span>
                <span className="text-xs font-bold text-white">Ava</span>
                <span className="text-xs text-slate-400 font-medium">• Pewawancara HR Tunggal (1-on-1)</span>
              </div>

              {/* Status Text Under Avatar */}
              <div className="relative z-10 mt-2 text-center px-6">
                <p className="text-sm font-bold text-white">
                  {saveStatus === 'saving' ? 'Menyimpan wawancara...' :
                   aiThinking ? 'Ava sedang menganalisis respons Anda...' :
                   !isMicOn ? 'Mikrofon Dinonaktifkan (Muted)' :
                   isSpeaking ? 'Ava sedang berbicara...' :
                   status === 'Listening' ? 'Mendengarkan Anda (Bicara sekarang)...' :
                   status === 'Ready' ? 'Mikrofon Siap — Silakan bicara' :
                   status === 'Connecting' ? 'Menghubungkan ke AI...' :
                   status === 'Connected' ? 'Sesi terhubung...' :
                   'Tekan "Mulai" untuk memulai sesi'}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {!isMicOn ? 'Suara sekitar tidak didengar Ava. Waktu wawancara tetap berjalan.' :
                   status === 'Ready' ? 'Jawab pertanyaan Ava secara lisan atau ketik pesan di samping' :
                   selectedJob?.title || 'Wawancara Kompetensi Kerja'}
                </p>
              </div>

              {/* Phase Step Indicator (Fase 1-4) */}
              <div className="relative z-10 mt-4 w-full max-w-sm px-6">
                <div className="flex items-center gap-1.5">
                  {PHASE_LABELS.map((label, i) => (
                    <div key={label} className="flex-1 flex flex-col items-center gap-1" title={PHASE_DESCRIPTIONS[i]}>
                      <div className={`w-full h-1 rounded-full transition-all duration-500 ${
                        i < currentPhase ? 'bg-[#14b8a6]' :
                        i === currentPhase ? 'bg-gradient-to-r from-[#14b8a6] to-teal-300 shadow-sm' :
                        'bg-white/10'
                      }`} />
                      <span className={`text-[8px] font-bold whitespace-nowrap ${
                        i === currentPhase ? 'text-teal-300' :
                        i < currentPhase ? 'text-slate-400' :
                        'text-slate-600'
                      }`}>
                        {i + 1}. {label.split(' ')[0]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Picture-in-Picture Webcam Preview */}
              {isCameraOn && (
                <div className="absolute bottom-4 right-4 z-20 w-44 sm:w-52 aspect-video bg-slate-900 rounded-2xl overflow-hidden border-2 border-white/80 shadow-2xl transition-all animate-scale-in">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                  <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[9px] font-bold text-white truncate max-w-[80px]">
                      {applicantName ? applicantName.split(' ')[0] : 'Anda'}
                    </span>
                  </div>
                  <button
                    onClick={toggleCamera}
                    className="absolute top-2 right-2 p-1 rounded-md bg-black/60 hover:bg-black/80 text-white/80 hover:text-white transition-all"
                    title="Matikan Kamera"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Closed Captions Subtitle Box */}
              {showCaptions && (isSpeaking || status === 'Listening') && messages.length > 0 && (() => {
                const lastMsg = [...messages].reverse().find(m => m.sender === (isSpeaking ? 'ai' : 'candidate'));
                if (lastMsg && lastMsg.text.length > 0) {
                  return (
                    <div className="absolute bottom-4 left-6 right-6 z-10 pointer-events-none">
                      <div className="bg-slate-900/85 backdrop-blur-md rounded-2xl px-5 py-2.5 max-w-lg mx-auto shadow-2xl border border-white/10">
                        <p className="text-[9px] font-bold text-teal-400 mb-0.5 uppercase tracking-wider text-center">
                          {lastMsg.sender === 'ai' ? 'Ava (AI Interviewer)' : (applicantName || 'Anda')}
                        </p>
                        <p className="text-white text-xs text-center leading-relaxed font-medium line-clamp-2">
                          {lastMsg.text}
                        </p>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>

          {/* ─── Bottom Interactive Control Bar ─── */}
          <div className="flex-shrink-0 bg-white border-t border-slate-200 px-6 py-3.5 z-20">
            <div className="flex items-center justify-center gap-3 sm:gap-4 max-w-xl mx-auto">

              {/* Tombol 1: Mikrofon (Aktifkan / Nonaktifkan) */}
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={toggleMicMute}
                  disabled={status === 'Disconnected' || status === 'Connecting'}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                    !isMicOn
                      ? 'bg-red-50 text-red-500 border-2 border-red-200 hover:bg-red-100 shadow-sm'
                      : 'bg-emerald-50 text-emerald-600 border-2 border-emerald-300 hover:bg-emerald-100 shadow-md shadow-emerald-500/20'
                  }`}
                  title={isMicOn ? 'Nonaktifkan Mikrofon (Mute)' : 'Aktifkan Mikrofon (Unmute)'}
                >
                  {isMicOn ? <Mic className="w-5 h-5 text-emerald-600" /> : <MicOff className="w-5 h-5 text-red-500" />}
                </button>
                <span className={`text-[10px] font-bold ${isMicOn ? 'text-emerald-600' : 'text-red-500'}`}>
                  {isMicOn ? 'Mic Aktif' : 'Mic Mati'}
                </span>
              </div>

              {/* Camera Preview Toggle */}
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={toggleCamera}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                    isCameraOn
                      ? 'bg-emerald-50 text-emerald-600 border-2 border-emerald-300 shadow-md shadow-emerald-500/20'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border-2 border-transparent'
                  }`}
                  title={isCameraOn ? 'Matikan Kamera' : 'Nyalakan Kamera'}
                >
                  {isCameraOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </button>
                <span className={`text-[10px] font-bold ${isCameraOn ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {isCameraOn ? 'Cam Aktif' : 'Cam'}
                </span>
              </div>

              {/* CC / Subtitel Toggle */}
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={() => setShowCaptions(!showCaptions)}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 font-extrabold text-xs ${
                    showCaptions
                      ? 'bg-[#14b8a6] text-white border-2 border-[#14b8a6] shadow-md shadow-[#14b8a6]/25'
                      : 'bg-slate-100 text-slate-400 hover:bg-slate-200 border-2 border-transparent'
                  }`}
                  title={showCaptions ? 'Sembunyikan Subtitel' : 'Tampilkan Subtitel'}
                >
                  CC
                </button>
                <span className={`text-[10px] font-bold ${showCaptions ? 'text-[#0d9488]' : 'text-slate-400'}`}>
                  Subtitel
                </span>
              </div>

              {/* Fullscreen Toggle */}
              <div className="flex flex-col items-center gap-1">
                <button
                  onClick={toggleFullscreen}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                    isFullscreen
                      ? 'bg-blue-50 text-blue-600 border-2 border-blue-300 shadow-md shadow-blue-500/20'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border-2 border-transparent'
                  }`}
                  title={isFullscreen ? 'Keluar Layar Penuh' : 'Mode Layar Penuh'}
                >
                  {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                </button>
                <span className={`text-[10px] font-bold ${isFullscreen ? 'text-blue-600' : 'text-slate-400'}`}>
                  {isFullscreen ? 'Normal' : 'Layar Penuh'}
                </span>
              </div>

              {/* Connect / Start Button (when disconnected) */}
              {!isActive && (
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={() => connect()}
                    disabled={!selectedJob || status === 'Connecting'}
                    className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[#14b8a6] to-[#0d9488] text-white shadow-lg shadow-[#14b8a6]/30 hover:shadow-xl transition-all disabled:opacity-50"
                    title="Mulai Interview"
                  >
                    {status === 'Connecting' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                  </button>
                  <span className="text-[10px] font-bold text-[#0d9488]">Mulai</span>
                </div>
              )}

              {/* Leave / End Call Button (when active) */}
              {isActive && (
                <div className="flex flex-col items-center gap-1">
                  <button
                    onClick={disconnect}
                    disabled={saveStatus === 'saving'}
                    className="w-12 h-12 rounded-2xl flex items-center justify-center bg-red-500 text-white shadow-lg shadow-red-500/30 hover:bg-red-600 hover:shadow-xl transition-all disabled:opacity-50"
                    title="Akhiri Interview & Lihat Hasil"
                  >
                    {saveStatus === 'saving' ? <Loader2 className="w-5 h-5 animate-spin" /> : <PhoneOff className="w-5 h-5" />}
                  </button>
                  <span className="text-[10px] text-red-500 font-bold">Akhiri</span>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* ─── Right Panel: Messages / Info / Stats / Tips ─── */}
        <aside className="w-80 flex-shrink-0 bg-white border-l border-slate-200 flex flex-col z-10">
          {/* Tab Header Bar */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setRightTab('messages')}
              className={`flex-1 py-3 text-xs font-bold transition-colors ${
                rightTab === 'messages' ? 'text-[#0d9488] border-b-2 border-[#14b8a6]' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Pesan ({messages.filter(m => m.sender !== 'system').length})
            </button>
            <button
              onClick={() => setRightTab('stats')}
              className={`flex-1 py-3 text-xs font-bold transition-colors ${
                rightTab === 'stats' ? 'text-[#0d9488] border-b-2 border-[#14b8a6]' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Statistik
            </button>
            <button
              onClick={() => setRightTab('info')}
              className={`flex-1 py-3 text-xs font-bold transition-colors ${
                rightTab === 'info' ? 'text-[#0d9488] border-b-2 border-[#14b8a6]' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Info
            </button>
            <button
              onClick={() => setRightTab('tips')}
              className={`flex-1 py-3 text-xs font-bold transition-colors ${
                rightTab === 'tips' ? 'text-[#0d9488] border-b-2 border-[#14b8a6]' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Tips
            </button>
          </div>

          {/* ─── Messages Tab ─── */}
          {rightTab === 'messages' && (
            <>
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-12">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                      <MessageSquare className="w-6 h-6 text-slate-300" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-600 mb-1">Belum Ada Pesan</h3>
                    <p className="text-xs text-slate-400 max-w-[200px]">
                      Mulai sesi interview dan percakapan suara maupun teks akan muncul di sini secara real-time.
                    </p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    if (msg.sender === 'system') {
                      return (
                        <div key={msg.id} className="flex justify-center">
                          <div className="px-3 py-1.5 rounded-full bg-slate-100 text-slate-500 text-[10px] text-center max-w-[90%] leading-relaxed font-medium">
                            {msg.text}
                          </div>
                        </div>
                      );
                    }
                    const isCandidate = msg.sender === 'candidate';
                    return (
                      <div key={msg.id} className={`flex gap-2 animate-slide-up ${isCandidate ? 'justify-end' : 'justify-start'}`}>
                        {!isCandidate && (
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#14b8a6] to-[#0d9488] flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                            <Zap className="w-3.5 h-3.5 text-white" />
                          </div>
                        )}
                        <div className={`max-w-[85%] ${isCandidate ? 'order-first' : ''}`}>
                          <p className={`text-[10px] font-bold mb-1 ${isCandidate ? 'text-right text-slate-400' : 'text-slate-400'}`}>
                            {isCandidate ? (applicantName || 'Anda') : 'Ava (AI)'}
                          </p>
                          <div className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                            isCandidate
                              ? 'bg-[#14b8a6] text-white rounded-br-md shadow-sm'
                              : 'bg-slate-100 text-slate-700 rounded-bl-md'
                          }`}>
                            {msg.text}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Text Input Box */}
              <div className="border-t border-slate-200 px-4 py-3 bg-white">
                {isMicOn && isActive && (
                  <div className="flex justify-end mb-2">
                    <button
                      onClick={handleFinishTurn}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-700 text-[10px] font-bold shadow-2xs transition-all"
                      title="Klik jika sudah selesai menjawab agar Ava langsung merespons"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                      <span>Selesai Menjawab (Kirim ke Ava)</span>
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2">
                  <button className="text-slate-400 hover:text-slate-600 transition-colors" title="Emoji">
                    <Smile className="w-4 h-4" />
                  </button>
                  <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendText()}
                    disabled={!isActive}
                    placeholder={isActive ? 'Ketik pesan atau jawaban...' : 'Mulai interview terlebih dahulu'}
                    className="flex-1 bg-transparent text-xs text-slate-700 placeholder-slate-400 focus:outline-none"
                  />
                  <button
                    onClick={sendText}
                    disabled={!isActive || !text.trim()}
                    className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#f97316] to-[#ea580c] text-white flex items-center justify-center hover:shadow-md transition-all disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ─── Stats Tab ─── */}
          {rightTab === 'stats' && (
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Statistik Wawancara</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white p-3 rounded-xl border border-slate-100 text-center shadow-sm">
                    <p className="text-xl font-extrabold text-slate-800">{questionCount}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Pertanyaan AI</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-100 text-center shadow-sm">
                    <p className="text-xl font-extrabold text-slate-800">{messages.filter(m => m.sender === 'candidate').length}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Jawaban Anda</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-100 text-center shadow-sm">
                    <p className="text-xl font-extrabold text-slate-800 font-mono">{formatTime(elapsed)}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Durasi</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-100 text-center shadow-sm">
                    <p className="text-xl font-extrabold text-slate-800 font-mono">
                      {timeRemaining !== null ? formatTime(timeRemaining) : '-'}
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Sisa Waktu</p>
                  </div>
                </div>
              </div>

              {/* Phase progress list */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2.5">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Fase Wawancara</h4>
                {PHASE_LABELS.map((label, idx) => (
                  <div
                    key={label}
                    className={`p-3 rounded-xl border transition-all ${
                      idx === currentPhase
                        ? 'bg-teal-50 border-teal-200 shadow-sm'
                        : idx < currentPhase
                          ? 'bg-white border-slate-200'
                          : 'bg-white/60 border-slate-100 opacity-60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${idx === currentPhase ? 'text-[#0d9488]' : 'text-slate-700'}`}>
                        {idx + 1}. {label}
                      </span>
                      {idx < currentPhase ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                      ) : idx === currentPhase ? (
                        <span className="text-[9px] font-extrabold uppercase text-teal-600 bg-teal-100/70 px-2 py-0.5 rounded-full animate-pulse">
                          Sedang Berjalan
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-slate-300">Menunggu</span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{PHASE_DESCRIPTIONS[idx]}</p>
                  </div>
                ))}
              </div>

              {/* Proctor integrity status */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Integritas Sesi</h4>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    proctorWarnings.length === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {proctorWarnings.length === 0 ? 'Normal / Aman' : `${proctorWarnings.length} Catatan`}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Sistem proctoring memantau fokus jendela browser untuk memastikan wawancara berlangsung adil dan profesional.
                </p>
              </div>
            </div>
          )}

          {/* ─── Info Tab ─── */}
          {rightTab === 'info' && (
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {/* Participant info */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Kandidat Peserta</h4>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#14b8a6] to-[#0d9488] flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm">
                    {(applicantName || applicantEmail).charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 truncate">{applicantName || 'Peserta Wawancara'}</p>
                    <p className="text-xs text-slate-400 truncate">{applicantEmail}</p>
                  </div>
                </div>
              </div>

              {/* Job info */}
              {selectedJob && (
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-3">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Posisi yang Dilamar</h4>
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-[#14b8a6]" />
                    <span className="text-sm font-bold text-slate-800">{selectedJob.title}</span>
                  </div>
                  {selectedJob.description && (
                    <div className="bg-white p-3 rounded-xl border border-slate-100 text-xs text-slate-600 leading-relaxed max-h-36 overflow-y-auto">
                      {selectedJob.description}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                    {selectedJob.interviewDuration && (
                      <div className="bg-white p-2 rounded-lg border border-slate-100 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#14b8a6]" />
                        <span>{selectedJob.interviewDuration} menit</span>
                      </div>
                    )}
                    {selectedJob.interviewPassingScore !== null && (
                      <div className="bg-white p-2 rounded-lg border border-slate-100 flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 text-[#f97316]" />
                        <span>Min: {selectedJob.interviewPassingScore}%</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Session Configuration */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Konfigurasi Audio AI</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Pewawancara</span>
                    <span className="font-bold text-slate-700">Ava Virtual Recruiter</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Karakter Suara</span>
                    <span className="font-bold text-slate-700">{voice} Voice</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Bahasa Percakapan</span>
                    <span className="font-bold text-slate-700">{language}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── Tips Tab ─── */}
          {rightTab === 'tips' && (
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Panduan Wawancara Sukses</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                  Pewawancara AI menilai jawaban Anda berdasarkan relevansi, kejelasan komunikasi, dan pemikiran analitis.
                </p>
                <div className="space-y-2.5 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-slate-100">
                    <p className="font-bold text-slate-700 mb-0.5">Gunakan Metode STAR</p>
                    <p className="text-[11px] text-slate-500">Situation, Task, Action, dan Result untuk menjawab pertanyaan studi kasus.</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-100">
                    <p className="font-bold text-slate-700 mb-0.5">Bicara Tenang & Jelas</p>
                    <p className="text-[11px] text-slate-500">Ambil jeda sejenak untuk memikirkan jawaban sebelum berbicara ke mikrofon.</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-100">
                    <p className="font-bold text-slate-700 mb-0.5">Tatap Kamera</p>
                    <p className="text-[11px] text-slate-500">Aktifkan preview kamera Anda agar postur dan kontak mata tetap optimal.</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-100">
                    <p className="font-bold text-slate-700 mb-0.5">Dapat Mengetik</p>
                    <p className="text-[11px] text-slate-500">Bila mikrofon mengalami gangguan suara, Anda dapat melengkapi jawaban lewat teks.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
