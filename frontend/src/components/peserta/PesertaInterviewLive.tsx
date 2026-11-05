import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Share2,
  MessageSquare,
  LogOut,
  Clock,
  ShieldCheck,
  Send,
  HelpCircle,
  Sparkles,
  ChevronRight,
  Volume2,
  VolumeX,
  Play,
  CheckCircle2,
  AlertCircle,
  Check,
  ArrowRight,
  Waves,
  Brain,
  Zap,
  ArrowLeft,
  RotateCcw,
  Award,
  Keyboard,
  Home
} from 'lucide-react';
import { Button, Badge, Modal } from '../ui';
import { getActiveSessionUser } from '../../services/userRegistryService';
import { getProgramById } from '../../services/assessmentCatalog';
import { getPortalToken } from '../../services/portalAuthService';
import { ProctoringCharacter, type ProctoringMood } from './ProctoringCharacter';

interface QuestionItem {
  id: number;
  question: string;
  competency: string;
  weight: string;
  status: 'completed' | 'active' | 'upcoming';
  score?: number;
  rubricLevel?: string;
  rubricCriteria?: string[];
  aiFeedback?: string;
  sampleAnswer?: string;
}

// Normalisasi teks transkrip agar bisa dibandingkan tanpa duplikasi
const normalizeTranscript = (text: string) => text.toLowerCase().replace(/\s+/g, ' ').trim();

export default function PesertaInterviewLive() {
  const navigate = useNavigate();
  const sessionUser = useMemo(() => getActiveSessionUser(), []);
  const program = useMemo(
    () => getProgramById(sessionUser.assessmentId || 'SE-402') || getProgramById('SE-402')!,
    [sessionUser.assessmentId]
  );

  // Audio / Video device states
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [micVolumeLevel, setMicVolumeLevel] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [hasStartedInterview, setHasStartedInterview] = useState(false);

  // Audio Context, MediaRecorder, and WebSocket refs for duplex 2-way interaction
  const audioCtxRef = useRef<AudioContext | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const pcmCtxRef = useRef<AudioContext | null>(null);
  const pcmSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const isStreamingPcmRef = useRef(false);
  const isAiSpeakingRef = useRef(false);
  const hasStartedInterviewRef = useRef(false);
  const micOnRef = useRef(true);
  const handsFreeModeRef = useRef(true);
  const isLiveConnectedRef = useRef(false);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesCountRef = useRef<number>(0);
  const volumeAnimRef = useRef<number | null>(null);
  const aiAudioElementRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const speechRecognitionRef = useRef<any>(null);
  const isListeningRef = useRef<boolean>(false);
  const liveTurnHandledRef = useRef(0);

  // Live real-time speech preview & UI simplicity state
  const [liveInterimText, setLiveInterimText] = useState('');
  // Hitungan giliran real-time: memicu evaluasi otomatis saat peserta selesai bicara
  const [liveTurnSeq, setLiveTurnSeq] = useState(0);
  const [handsFreeMode, setHandsFreeMode] = useState(true);
  const [showManualInput, setShowManualInput] = useState(false);
  const [micErrorMsg, setMicErrorMsg] = useState<string | null>(null);

  // Proctoring Character states
  const [proctorMood, setProctorMood] = useState<ProctoringMood>('normal');
  const [proctorCustomMessage, setProctorCustomMessage] = useState<string | undefined>(undefined);
  const [showProctor, setShowProctor] = useState(false);

  // Time elapsed
  const [sessionSeconds, setSessionSeconds] = useState(0);

  // Registered face photo from device check
  const savedFacePhoto = localStorage.getItem('candidate_face_photo');

  // Candidate answers and active question (starts at Question 1)
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [isCompletedModalOpen, setIsCompletedModalOpen] = useState(false);

  // Questions Pipeline (4 technical competency questions)
  const [questions, setQuestions] = useState<QuestionItem[]>([
    {
      id: 1,
      question:
        'Bagaimana Anda mengimplementasikan arsitektur Event-Driven menggunakan Apache Kafka untuk menjamin idempotensi pengiriman data transaksi antar microservices?',
      competency: 'Arsitektur Event-Driven & Messaging',
      weight: '25%',
      status: 'active',
      sampleAnswer:
        'Kami menerapkan Transactional Outbox Pattern pada basis data relasional dipadukan dengan De-duplication ID pada Redis dan Kafka consumer idempotent offset management untuk mencegah pemrosesan transaksi ganda.'
    },
    {
      id: 2,
      question:
        'Bagaimana strategi Anda dalam menangani database deadlock pada skenario transaksi concurrent yang tinggi pada sistem core banking / telekomunikasi?',
      competency: 'Database Tuning & Concurrency Control',
      weight: '25%',
      status: 'upcoming',
      sampleAnswer:
        'Menerapkan optimistic locking dengan version column, row-level locks dengan urutan query deterministik (consistent lock acquisition order), dan redis distributed mutex dengan backoff retry.'
    },
    {
      id: 3,
      question:
        'Jelaskan pendekatan Anda dalam merancang circuit breaker dan backpressure handling ketika downstream service mengalami penurunan performa drastis.',
      competency: 'Resilience & Distributed Systems',
      weight: '25%',
      status: 'upcoming',
      sampleAnswer:
        'Mengonfigurasi Resilience4j/Hystrix dengan threshold failure rate 50% dan sliding window, fallback response dari read-replica cache, serta menerapkan Reactive Streams backpressure handling.'
    },
    {
      id: 4,
      question:
        'Ceritakan studi kasus nyata saat Anda melakukan Root Cause Analysis (RCA) pada insiden production outage kritis, serta mitigasi preventif jangka panjangnya.',
      competency: 'Incident Management & Problem Solving',
      weight: '25%',
      status: 'upcoming',
      sampleAnswer:
        'Pada insiden memory leak di JVM garbage collection, kami menggunakan memory profiler heap dump untuk melacak unclosed database connection pool, merevisi pooling leak, dan menambahkan alert Prometheus.'
    }
  ]);

  // Real-time dialogue messages
  const [messages, setMessages] = useState<
    { sender: 'Gemini Live' | 'Kandidat (Anda)' | 'Sistem'; text: string; time: string }[]
  >(() => [
    {
      sender: 'Sistem',
      text: 'Sesi live interview dimulai. Evaluasi berbasis Google Gemini 2.5 Flash Live Multimodal dan Standar BARS aktif.',
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    },
    {
      sender: 'Gemini Live',
      text: `Halo ${sessionUser.name || 'Farhan Pratama'}, selamat datang di sesi wawancara AI Right untuk ${program.companyName || 'PT Telkom Indonesia Tbk'}. Saya Gemini 2.5 Flash Live Assessor. Mari kita mulai dengan pertanyaan pertama terkait arsitektur sistem.`,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  // Video element ref for real webcam feed
  const videoRef = useRef<HTMLVideoElement>(null);

  // Initialize camera stream
  useEffect(() => {
    let cancelled = false;
    const checkCatEligibility = async () => {
      const token = getPortalToken();
      if (!token) {
        navigate('/peserta/waiting-room');
        return;
      }
      try {
        const response = await axios.get(`/api/exam/${program.id}/result`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!cancelled && !['submitted', 'graded'].includes(response.data.status)) {
          navigate('/peserta/waiting-room');
        }
      } catch {
        if (!cancelled) navigate('/peserta/waiting-room');
      }
    };
    void checkCatEligibility();
    return () => {
      cancelled = true;
    };
  }, [program.id, navigate]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    if (camOn && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: false })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.play().catch(() => {});
          }
        })
        .catch(() => {
          // Graceful fallback to registered photo / avatar
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [camOn]);

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadQuestions = async () => {
      const token = getPortalToken();
      if (!token) return;
      try {
        const response = await axios.get('/api/interview/questions', {
          params: { programCode: program.id },
          headers: { Authorization: `Bearer ${token}` }
        });
        if (cancelled) return;
        const items = response.data?.data;
        if (Array.isArray(items) && items.length > 0) {
          setQuestions(items.map((item: any, index: number) => ({
            id: item.id || index + 1,
            question: item.question,
            competency: item.competency,
            weight: item.weight || '25%',
            status: index === 0 ? 'active' : 'upcoming',
            sampleAnswer: item.sampleAnswer || ''
          })));
        }
      } catch {
        // Keep built-in fallback questions.
      }
    };
    void loadQuestions();
    return () => {
      cancelled = true;
    };
  }, [program.id]);

  // Auto-connect to Gemini Live when component mounts & unlock audio on user gesture
  useEffect(() => {
    connectGeminiLive();

    const unlockAudio = () => {
      getOrCreateAudioContext();
    };
    window.addEventListener('click', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });

    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  useEffect(() => {
    isAiSpeakingRef.current = isAiSpeaking;
  }, [isAiSpeaking]);

  useEffect(() => {
    hasStartedInterviewRef.current = hasStartedInterview;
  }, [hasStartedInterview]);

  useEffect(() => {
    micOnRef.current = micOn;
  }, [micOn]);

  useEffect(() => {
    handsFreeModeRef.current = handsFreeMode;
  }, [handsFreeMode]);

  useEffect(() => {
    isLiveConnectedRef.current = isLiveConnected;
  }, [isLiveConnected]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (volumeAnimRef.current) cancelAnimationFrame(volumeAnimRef.current);
      if (aiAudioElementRef.current) {
        aiAudioElementRef.current.pause();
        aiAudioElementRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      stopPcmStreaming();
      if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
      }
      if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      if (inputAudioCtxRef.current) inputAudioCtxRef.current.close().catch(() => {});
      if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
      if (socketRef.current) socketRef.current.close();
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    };
  }, []);

  const formatTimer = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  // Initialize Web Audio Context for output playback
  const getOrCreateAudioContext = () => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioCtxRef.current = new AudioCtx();
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  };

  // Play synthesized harmonic chime when AI starts talking (reliable across all OS / browsers)
  const playHarmonicAiChime = () => {
    try {
      const ctx = getOrCreateAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0.06, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.36);
      });
    } catch {
      // ignore
    }
  };

  // Play real PCM audio chunks streamed from Google Gemini Live (24kHz) safely with DataView
  const playPcmAudioChunk = (base64Data: string) => {
    const ctx = getOrCreateAudioContext();
    if (!ctx) return;

    try {
      const binaryString = window.atob(base64Data);
      const len = binaryString.length;
      if (len < 2) return;

      const sampleCount = Math.floor(len / 2);
      const audioBuffer = ctx.createBuffer(1, sampleCount, 24000);
      const channelData = audioBuffer.getChannelData(0);

      const buffer = new ArrayBuffer(len);
      const view = new DataView(buffer);
      for (let i = 0; i < len; i++) {
        view.setUint8(i, binaryString.charCodeAt(i));
      }

      for (let i = 0; i < sampleCount; i++) {
        channelData[i] = view.getInt16(i * 2, true) / 32768.0;
      }

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      const startTime = Math.max(ctx.currentTime, nextStartTimeRef.current);
      source.start(startTime);
      nextStartTimeRef.current = startTime + audioBuffer.duration;

      activeSourcesCountRef.current++;
      setIsAiSpeaking(true);

      source.onended = () => {
        activeSourcesCountRef.current = Math.max(0, activeSourcesCountRef.current - 1);
        if (activeSourcesCountRef.current === 0) {
          setTimeout(() => {
            if (activeSourcesCountRef.current === 0) {
              setIsAiSpeaking(false);
              if (
                hasStartedInterviewRef.current &&
                handsFreeModeRef.current &&
                micOnRef.current &&
                !isListeningRef.current
              ) {
                void handleStartListening();
              }
            }
          }, 300);
        }
      };
    } catch (e) {
      console.warn('PCM Audio playback error:', e);
    }
  };

  // Connect Gemini Live WebSocket
  const connectGeminiLive = (greetingText?: string) => {
    getOrCreateAudioContext();
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      if (greetingText) {
        socketRef.current.send(JSON.stringify({ type: 'text', text: greetingText }));
      }
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/interview/live?voice=Kore&language=Indonesian&candidateName=${encodeURIComponent(
        sessionUser.name || 'Budi Santoso'
      )}&jobTitle=${encodeURIComponent(program.title || 'Software Engineer')}&company=${encodeURIComponent(
        program.companyName || 'PT Bank Mandiri (Persero) Tbk'
      )}&token=${encodeURIComponent(getPortalToken() || '')}`;

      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setIsLiveConnected(true);
        playHarmonicAiChime();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'ready') {
            setIsLiveConnected(true);
          } else if (data.type === 'audio' && data.data) {
            playPcmAudioChunk(data.data);
          } else if (data.type === 'aiText' && data.text) {
            const raw = data.text;
            // Filter out system thinking / markdown meta headers if any
            const cleanText = raw.replace(/\*\*.*?\*\*/g, '').trim();
            if (cleanText) {
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last && last.sender === 'Gemini Live') {
                  return [...prev.slice(0, -1), { ...last, text: last.text + ' ' + cleanText }];
                } else {
                  return [
                    ...prev,
                    {
                      sender: 'Gemini Live',
                      text: cleanText,
                      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                    }
                  ];
                }
              });
            }
          } else if (data.type === 'candidateText' && data.text) {
            setUserAnswer((prev) => (prev ? `${prev} ${data.text}` : data.text));
            // Catat suara peserta ke panel transkrip (gabungkan dengan segmen kandidat sebelumnya)
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.sender === 'Kandidat (Anda)') {
                return [...prev.slice(0, -1), { ...last, text: `${last.text} ${data.text}` }];
              }
              return [
                ...prev,
                {
                  sender: 'Kandidat (Anda)',
                  text: data.text,
                  time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
                }
              ];
            });
          } else if (data.type === 'turnComplete') {
            setIsAiSpeaking(false);
            // Tandai giliran peserta selesai — dipakai untuk pengiriman jawaban otomatis
            setLiveTurnSeq((seq) => seq + 1);
            if (
              hasStartedInterviewRef.current &&
              handsFreeModeRef.current &&
              micOnRef.current &&
              !isListeningRef.current
            ) {
              setTimeout(() => {
                if (!isListeningRef.current) void handleStartListening();
              }, 700);
            }
          }
        } catch {
          // ignore
        }
      };

      ws.onerror = () => {
        setIsLiveConnected(false);
      };

      ws.onclose = () => {
        setIsLiveConnected(false);
      };
    } catch {
      setIsLiveConnected(false);
    }
  };

  // Play Neural Base64 Audio cleanly across all browsers
  const playAiAudio = (base64AudioUrl: string, onEnded?: () => void) => {
    try {
      if (!base64AudioUrl) {
        if (onEnded) onEnded();
        return;
      }
      playHarmonicAiChime();
      if (!aiAudioElementRef.current) {
        aiAudioElementRef.current = new Audio();
      }
      const audio = aiAudioElementRef.current;
      audio.pause();
      audio.src = base64AudioUrl;
      setIsAiSpeaking(true);
      setProctorMood('normal');

      audio.onended = () => {
        setIsAiSpeaking(false);
        if (onEnded) onEnded();
      };

      audio.onerror = () => {
        setIsAiSpeaking(false);
        if (onEnded) onEnded();
      };

      audio.play().catch(() => {
        setIsAiSpeaking(false);
        if (onEnded) onEnded();
      });
    } catch {
      setIsAiSpeaking(false);
      if (onEnded) onEnded();
    }
  };

  // Request high-quality Indonesian Neural Speech from backend (/api/interview/tts)
  const speakTextWithNeuralVoice = async (text: string, onEnded?: () => void) => {
    playHarmonicAiChime();

    if (!ttsEnabled) {
      if (onEnded) onEnded();
      return;
    }

    try {
      const res = await fetch('/api/interview/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: 'id-ID-GadisNeural' })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.audioBase64) {
          playAiAudio(json.audioBase64, onEnded);
          return;
        }
      }
    } catch (e) {
      console.warn('Neural TTS request fallback to browser:', e);
    }

    // Fallback to browser SpeechSynthesis
    speakText(text);
    if (onEnded) {
      setTimeout(onEnded, 4000);
    }
  };

  // Text to Speech for Gemini Voice with Multimodal Fallback
  const speakText = (text: string) => {
    playHarmonicAiChime();

    // 1. If Gemini Live socket is open, ask Gemini Live to speak with voice
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'text',
          text: `Tolong sampaikan dan tanyakan pertanyaan ini kepada kandidat dengan suara ramah dan jelas: "${text}"`
        })
      );
      return;
    }

    // 2. Fallback to browser SpeechSynthesis if socket not connected
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'id-ID';
      utterance.rate = 1.05;

      const voices = window.speechSynthesis.getVoices();
      const idVoice = voices.find((v) => v.lang.startsWith('id'));
      if (idVoice) utterance.voice = idVoice;

      utterance.onstart = () => {
        setIsAiSpeaking(true);
        setProctorMood('normal');
      };
      utterance.onend = () => {
        setIsAiSpeaking(false);
      };
      utterance.onerror = () => {
        setIsAiSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
    } else {
      setIsAiSpeaking(true);
      setTimeout(() => setIsAiSpeaking(false), 3000);
    }
  };

  // Initial Auto-Greeting from AI Interviewer Ava
  const startInitialGreeting = async () => {
    setHasStartedInterview(true);
    getOrCreateAudioContext();

    const greetingText = `Halo ${sessionUser.name || 'Farhan Pratama'}, saya Ava. Mari mulai wawancara untuk posisi ${program.title}. ${questions[0].question}`;

    setMessages((prev) => [
      ...prev,
      {
        sender: 'Gemini Live',
        text: greetingText,
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      }
    ]);

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'text', text: greetingText }));
      setProctorCustomMessage('Ava sedang menyapa. Mikrofon akan aktif setelah Ava selesai berbicara.');
      return;
    }

    await speakTextWithNeuralVoice(greetingText, () => {
      setProctorCustomMessage('Ava selesai membacakan pertanyaan. Giliran Anda menjawab. Silakan berbicara...');
      if (micOn) {
        handleStartListening();
      }
    });
  };

  // Stream raw PCM16 audio to Gemini Live so the AI hears the candidate in real time
  const startPcmStreaming = (stream: MediaStream) => {
    if (isStreamingPcmRef.current) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      let ctx: AudioContext;
      try {
        ctx = new AudioCtx({ sampleRate: 16000 });
      } catch {
        ctx = new AudioCtx();
      }
      const source = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(2048, 1, 1);
      processor.onaudioprocess = (event) => {
        if (!isStreamingPcmRef.current || isAiSpeakingRef.current) return;
        const socket = socketRef.current;
        if (!socket || socket.readyState !== WebSocket.OPEN) return;
        const input = event.inputBuffer.getChannelData(0);
        const ratio = ctx.sampleRate / 16000;
        const length = ratio === 1 ? input.length : Math.max(1, Math.floor(input.length / ratio));
        const pcm = new Int16Array(length);
        for (let i = 0; i < length; i += 1) {
          const sample = input[Math.floor(i * ratio)] || 0;
          pcm[i] = Math.max(-1, Math.min(1, sample)) * 0x7fff;
        }
        const bytes = new Uint8Array(pcm.buffer);
        let binary = '';
        const chunk = 0x2000;
        for (let i = 0; i < bytes.length; i += chunk) {
          binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
        }
        socket.send(JSON.stringify({
          type: 'audio',
          data: btoa(binary),
          mimeType: 'audio/pcm;rate=16000'
        }));
      };
      source.connect(processor);
      processor.connect(ctx.destination);
      pcmCtxRef.current = ctx;
      pcmSourceRef.current = source;
      processorRef.current = processor;
      isStreamingPcmRef.current = true;
    } catch (error) {
      console.warn('PCM streaming error:', error);
    }
  };

  const stopPcmStreaming = () => {
    isStreamingPcmRef.current = false;
    try {
      processorRef.current?.disconnect();
    } catch {}
    processorRef.current = null;
    try {
      pcmSourceRef.current?.disconnect();
    } catch {}
    pcmSourceRef.current = null;
    if (pcmCtxRef.current) {
      pcmCtxRef.current.close().catch(() => {});
      pcmCtxRef.current = null;
    }
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'audioEnd' }));
    }
  };

  // Start Candidate Voice Input with MediaRecorder, WebAudio, & Real-Time SpeechRecognition
  const handleStartListening = async () => {
    if (isListeningRef.current) return;
    try {
      getOrCreateAudioContext();
      if (aiAudioElementRef.current) {
        aiAudioElementRef.current.pause();
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setIsAiSpeaking(false);
      setMicErrorMsg(null);

      // 1. Acquire genuine physical microphone stream
      let stream = mediaStreamRef.current;
      if (!stream || !stream.active || stream.getAudioTracks().length === 0 || !stream.getAudioTracks()[0].enabled) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true
            }
          });
        } catch {
          // Standard audio fallback if constraints are rejected by driver
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        }
        mediaStreamRef.current = stream;
      }

      startPcmStreaming(stream);

      // 2. Initialize and resume input AudioContext
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      let ctx = inputAudioCtxRef.current;
      if (!ctx || ctx.state === 'closed') {
        ctx = new AudioCtx();
        inputAudioCtxRef.current = ctx;
      }
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);
      analyserRef.current = analyser;

      // 3. Audio Recorder setup for backup
      audioChunksRef.current = [];
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start(100);

      isListeningRef.current = true;
      setIsListening(true);
      setProctorMood('speaking');
      setProctorCustomMessage('Mikrofon aktif! Ava sedang mendengarkan suara Anda secara langsung.');

      // 4. Live volume meter animation (responsive logarithmic boost)
      const updateVolume = () => {
        if (!analyserRef.current || !isListeningRef.current) return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        // Non-linear scale for natural speaking volume (shows 25% - 90% clearly)
        const level = Math.min(100, Math.max(0, Math.round((avg / 35) * 100)));
        setMicVolumeLevel(level);
        volumeAnimRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();

      // 5. Browser Web Speech API for INSTANT Real-Time transcription on screen
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          if (speechRecognitionRef.current) {
            try {
              speechRecognitionRef.current.onend = null;
              speechRecognitionRef.current.onerror = null;
              speechRecognitionRef.current.abort();
            } catch {}
          }
          const recognition = new SpeechRecognition();
          recognition.lang = 'id-ID';
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.maxAlternatives = 1;

          recognition.onresult = (e: any) => {
            let fullTranscript = '';
            for (let i = 0; i < e.results.length; i++) {
              fullTranscript += e.results[i][0].transcript;
            }
            const clean = fullTranscript.trim();
            if (clean) {
              setUserAnswer(clean);
              setLiveInterimText(clean);
            }
          };

          recognition.onerror = (e: any) => {
            console.warn('SpeechRecognition warning:', e.error);
          };

          recognition.onend = () => {
            if (isListeningRef.current) {
              try {
                recognition.start();
              } catch {}
            }
          };

          recognition.start();
          speechRecognitionRef.current = recognition;
        } catch (recErr) {
          console.warn('SpeechRecognition start error:', recErr);
        }
      }
    } catch (err: any) {
      console.warn('Microphone error:', err);
      isListeningRef.current = false;
      setIsListening(false);
      setProctorMood('normal');
      setMicErrorMsg(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Izin mikrofon belum aktif di browser Anda. Klik ikon gembok di sebelah URL browser dan pilih "Izinkan Mikrofon", lalu coba lagi.'
          : 'Mikrofon tidak terdeteksi. Pastikan mikrofon laptop/headset Anda terpasang dan diizinkan.'
      );
    }
  };

  // Toggle Listening: If not listening, start. If listening, stop and transcribe.
  const handleToggleListening = async () => {
    // 1. If interview hasn't started yet, clicking the button begins the interview
    if (!hasStartedInterview) {
      setHasStartedInterview(true);
      // Pre-warm microphone permission in this direct user click gesture
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        mediaStreamRef.current = stream;
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') {
          await ctx.resume();
        }
        inputAudioCtxRef.current = ctx;
      } catch (e) {
        console.warn('Pre-warm mic error:', e);
      }
      await startInitialGreeting();
      return;
    }

    // 2. If AI is currently speaking and user clicks to speak, pause AI and listen
    if (isAiSpeaking) {
      if (aiAudioElementRef.current) {
        aiAudioElementRef.current.pause();
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      setIsAiSpeaking(false);
      await handleStartListening();
      return;
    }

    // 3. Otherwise toggle recording (listen / stop & submit)
    if (isListening) {
      await handleStopListeningAndSubmit();
    } else {
      await handleStartListening();
    }
  };

  const handleStopListeningAndSubmit = async () => {
    stopPcmStreaming();
    isListeningRef.current = false;
    setIsListening(false);
    setProctorMood('normal');
    setMicVolumeLevel(0);
    if (volumeAnimRef.current) {
      cancelAnimationFrame(volumeAnimRef.current);
      volumeAnimRef.current = null;
    }
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.onend = null;
        speechRecognitionRef.current.stop();
      } catch {}
      speechRecognitionRef.current = null;
    }

    let transcribedText = (userAnswer || liveInterimText).trim();

    // Filter out common silent timestamp artifacts ("00:00", "0:00", "...", etc.)
    if (
      transcribedText === '00:00' ||
      transcribedText === '0:00' ||
      /^\d{1,2}:\d{2}$/.test(transcribedText) ||
      transcribedText === '...' ||
      transcribedText.length < 2
    ) {
      transcribedText = '';
    }

    // 🚀 ULTRA-FAST REAL-TIME PIPELINE:
    // If client SpeechRecognition already transcribed the candidate's speech,
    // SUBMIT IMMEDIATELY! Skip the slow 4-5 second audio upload and server STT entirely!
    if (transcribedText) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch {}
      }
      await submitAnswerTurn(transcribedText, { silent: isLiveConnectedRef.current });
      return;
    }

    // Fallback: If client STT was empty, wait for recorder chunks and transcribe via server
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      setProctorCustomMessage('Menganalisis audio...');
      const audioBlob = await new Promise<Blob | null>((resolve) => {
        if (!mediaRecorderRef.current) return resolve(null);
        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(audioChunksRef.current, {
            type: mediaRecorderRef.current?.mimeType || 'audio/webm'
          });
          resolve(blob);
        };
        try {
          mediaRecorderRef.current.stop();
        } catch {
          resolve(null);
        }
      });

      if (audioBlob && audioBlob.size > 1500) {
        setIsTranscribing(true);
        try {
          const formData = new FormData();
          formData.append('audio', audioBlob, 'candidate_voice.webm');

          const transRes = await fetch('/api/interview/transcribe-audio', {
            method: 'POST',
            body: formData
          });

          if (transRes.ok) {
            const transJson = await transRes.json();
            if (transJson.text && transJson.text.trim()) {
              const cleaned = transJson.text.trim();
              if (
                cleaned !== '00:00' &&
                cleaned !== '0:00' &&
                !/^\d{1,2}:\d{2}$/.test(cleaned) &&
                cleaned !== '...' &&
                cleaned.length >= 2
              ) {
                transcribedText = cleaned;
                setUserAnswer(transcribedText);
              }
            }
          }
        } catch (e) {
          console.warn('STT error, falling back to text:', e);
        } finally {
          setIsTranscribing(false);
        }
      }
    }

    if (!transcribedText) {
      setProctorCustomMessage('Suara Anda belum terdengar di mikrofon. Silakan klik tombol mic untuk berbicara.');
      speakTextWithNeuralVoice(
        `Halo ${sessionUser.name || 'Kandidat'}, suara Anda belum terdengar di mikrofon. Silakan klik tombol mic di bawah dan sampaikan jawaban Anda ya.`
      );
      return;
    }

    // Submit answer to LangChain & BARS evaluation
    await submitAnswerTurn(transcribedText);
  };

  // Active question convenience
  const activeQuestion = questions[currentQIndex] || questions[0];

  // Submit Answer to LangChain & Gemini Live with BARS Rubrics
  const submitAnswerTurn = async (answerText: string, options?: { silent?: boolean }) => {
    const textToSubmit = answerText.trim() || activeQuestion.sampleAnswer || 'Saya telah menjelaskan solusi arsitektur saya secara langsung.';
    const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    // Append candidate answer to messages (lewati jika suara yang sama sudah tercatat dari transkripsi live)
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.sender === 'Kandidat (Anda)') {
        const spoken = normalizeTranscript(last.text);
        const submitted = normalizeTranscript(textToSubmit);
        if (spoken.includes(submitted) || submitted.includes(spoken)) return prev;
      }
      return [
        ...prev,
        {
          sender: 'Kandidat (Anda)',
          text: textToSubmit,
          time: nowTime
        }
      ];
    });

    setUserAnswer('');
    setLiveInterimText('');
    setIsAiAnalyzing(true);
    setProctorMood('verified');
    setProctorCustomMessage('LangChain & Gemini sedang menganalisis respon...');

    const activeQ = questions[currentQIndex];
    const nextIdx = currentQIndex + 1;
    const nextQ = questions[nextIdx]?.question || '';

    try {
      const res = await fetch('/api/interview/langchain-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: activeQ.question,
          candidateAnswer: textToSubmit,
          competency: activeQ.competency,
          candidateName: sessionUser.name,
          nextQuestion: nextQ,
          questionNumber: currentQIndex + 1,
          totalQuestions: questions.length,
          generateVoice: true
        })
      });

      if (!res.ok) throw new Error('Turn evaluation error');

      const json = await res.json();
      const evalData = json.data;

      setIsAiAnalyzing(false);

      // Check if candidate merely greeted, checked audio, or asked to repeat
      if (!evalData.shouldAdvanceQuestion) {
        const reply = evalData.conversationalReply;
        // Mode real-time: balasan Ava sudah tercatat dari stream Gemini Live, jangan duplikasi di transkrip
        if (!options?.silent) {
          setMessages((prev) => [
            ...prev,
            {
              sender: 'Gemini Live',
              text: reply,
              time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
            }
          ]);
        }

        if (!options?.silent && evalData.audioBase64 && ttsEnabled) {
          playAiAudio(evalData.audioBase64, () => {
            setProctorCustomMessage(`Ava selesai menyapa. Silakan jawab pertanyaan #${currentQIndex + 1}.`);
            if (handsFreeMode && micOn) {
              handleStartListening();
            }
          });
        } else if (!options?.silent && ttsEnabled) {
          speakTextWithNeuralVoice(reply, () => {
            if (handsFreeMode && micOn) {
              handleStartListening();
            }
          });
        } else if (handsFreeMode && micOn) {
          handleStartListening();
        }
        return;
      }

      // Valid technical answer => evaluate BARS & advance!
      const updatedQuestions = [...questions];
      updatedQuestions[currentQIndex].status = 'completed';
      updatedQuestions[currentQIndex].score = Number(evalData.score) || 0;
      updatedQuestions[currentQIndex].rubricLevel = evalData.rubricLevel;
      updatedQuestions[currentQIndex].rubricCriteria = evalData.rubricCriteria;
      updatedQuestions[currentQIndex].aiFeedback = evalData.aiFeedback || 'Evaluasi BARS selesai.';

      if (nextIdx < updatedQuestions.length) {
        updatedQuestions[nextIdx].status = 'active';
        setCurrentQIndex(nextIdx);
      } else {
        setIsCompletedModalOpen(true);
      }

      setQuestions(updatedQuestions);

      const geminiReply = evalData.conversationalReply;
      // Mode real-time: balasan Ava sudah tercatat dari stream Gemini Live, jangan duplikasi di transkrip
      if (!options?.silent) {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'Gemini Live',
            text: geminiReply,
            time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }

      // Play Neural Voice and auto-advance hands-free!
      if (!options?.silent && evalData.audioBase64 && ttsEnabled) {
        playAiAudio(evalData.audioBase64, () => {
          if (nextIdx < updatedQuestions.length) {
            setProctorCustomMessage(`Pertanyaan #${nextIdx + 1} aktif. Giliran Anda berbicara.`);
            if (handsFreeMode && micOn) {
              handleStartListening();
            }
          }
        });
      } else if (!options?.silent && ttsEnabled) {
        speakTextWithNeuralVoice(geminiReply, () => {
          if (nextIdx < updatedQuestions.length && handsFreeMode && micOn) {
            handleStartListening();
          }
        });
      }

      // If finished all questions, save interview!
      if (nextIdx >= updatedQuestions.length) {
        saveInterviewResults(updatedQuestions);
      }
    } catch {
      setIsAiAnalyzing(false);
      const updatedQuestions = [...questions];
      updatedQuestions[currentQIndex].status = 'completed';
      updatedQuestions[currentQIndex].score = 0;
      updatedQuestions[currentQIndex].aiFeedback =
        'Penilaian AI tidak tersedia. Jawaban Anda tetap tersimpan dan akan diverifikasi asesor.';

      let nextAiReply = '';
      if (nextIdx < updatedQuestions.length) {
        updatedQuestions[nextIdx].status = 'active';
        setCurrentQIndex(nextIdx);
        nextAiReply = `Terima kasih ${sessionUser.name}. Jawaban Anda telah diterima dan akan diverifikasi asesor. Sekarang mari kita lanjut ke soal #${nextIdx + 1}: ${updatedQuestions[nextIdx].question}`;
      } else {
        nextAiReply = `Luar biasa, ${sessionUser.name}. Seluruh 4 butir pertanyaan wawancara kompetensi telah selesai dijawab dengan sangat memuaskan.`;
        setIsCompletedModalOpen(true);
      }

      setQuestions(updatedQuestions);
      if (!options?.silent) {
        setMessages((prev) => [
          ...prev,
          {
            sender: 'Gemini Live',
            text: nextAiReply,
            time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }

      if (ttsEnabled) {
        speakTextWithNeuralVoice(nextAiReply, () => {
          if (nextIdx < updatedQuestions.length && micOn) {
            handleStartListening();
          }
        });
      }

      if (nextIdx >= updatedQuestions.length) {
        saveInterviewResults(updatedQuestions);
      }
    }
  };

  // Mode real-time: begitu server menandai giliran peserta selesai (turnComplete),
  // jawaban langsung dikirim untuk evaluasi BARS — tanpa tombol manual "Kirim ke Ava".
  useEffect(() => {
    if (liveTurnSeq === 0 || liveTurnSeq === liveTurnHandledRef.current) return;
    liveTurnHandledRef.current = liveTurnSeq;
    if (!hasStartedInterviewRef.current) return;
    const spoken = (liveInterimText || userAnswer).trim();
    if (spoken.length < 2) return;
    void submitAnswerTurn(spoken, { silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveTurnSeq]);

  // Submit Answer triggered by form button
  const handleSubmitAnswer = async (e?: React.FormEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isListening) {
      await handleStopListeningAndSubmit();
    } else {
      const text = userAnswer.trim() || activeQuestion.sampleAnswer || 'Saya telah menjelaskan analisis dan jawaban teknis saya secara langsung melalui suara.';
      await submitAnswerTurn(text, { silent: isLiveConnectedRef.current });
    }
  };

  // Save Interview Results to Backend
  const saveInterviewResults = async (completedQs: QuestionItem[]) => {
    try {
      const totalScore = completedQs.reduce((acc, q) => acc + (q.score || 0), 0);
      const avg = (totalScore / completedQs.length).toFixed(1);
      const formattedTranscript = messages
        .map((m) => `[${m.time}] ${m.sender}: ${m.text}`)
        .join('\n\n');

      await fetch('/api/interview/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: (sessionUser as any).email || sessionUser.username || 'peserta@proxsis.com',
          transcript: formattedTranscript,
          summary: `Wawancara AI LangChain & BARS selesai dengan skor rata-rata ${avg}/5.0. Kandidat mendemonstrasikan penguasaan kompetensi teknis yang tinggi.`,
          score: Number(avg) * 20,
          proctor: [{ type: 'face_verified', timestamp: new Date().toISOString() }]
        })
      });
    } catch (e) {
      console.warn('Save interview error:', e);
    }
  };

  // Chat send inside transcript drawer
  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    setMessages((prev) => [
      ...prev,
      {
        sender: 'Kandidat (Anda)',
        text: chatInput,
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'text', text: chatInput.trim() }));
    }
    setChatInput('');
  };

  const handleToggleMute = () => {
    const next = !micOn;
    setMicOn(next);
    mediaStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = next;
    });
  };

  const handleToggleScreenShare = async () => {
    if (isSharing) {
      screenStreamRef.current?.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
      setIsSharing(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      screenStreamRef.current = stream;
      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        setIsSharing(false);
        screenStreamRef.current = null;
      });
      setIsSharing(true);
    } catch {
      setIsSharing(false);
    }
  };

  useEffect(() => {
    if (screenVideoRef.current && screenStreamRef.current) {
      screenVideoRef.current.srcObject = screenStreamRef.current;
    }
  }, [isSharing]);

  // Average BARS score
  const completedQuestions = questions.filter((q) => q.status === 'completed' && q.score);
  const avgBearsScore = completedQuestions.length
    ? (
        completedQuestions.reduce((acc, q) => acc + (q.score || 0), 0) /
        completedQuestions.length
      ).toFixed(1)
    : '0.0';

  // Caption status di bawah video (bukan transkrip — transkrip ada di panel kanan)
  const stageCaption = isAiSpeaking
    ? 'Ava sedang berbicara — dengarkan pertanyaan dengan saksama.'
    : isTranscribing
    ? 'Ava sedang mentranskripsi suara Anda…'
    : isAiAnalyzing
    ? 'Ava sedang mengevaluasi jawaban Anda…'
    : isListening
    ? isLiveConnected
      ? 'Mic aktif — silakan jawab, Ava mendengarkan secara real-time.'
      : 'Mic aktif — sampaikan jawaban Anda, lalu tekan tombol Mic untuk mengirim.'
    : hasStartedInterview
    ? 'Mic siap — tekan tombol Mic bila ingin berbicara lagi.'
    : 'Tekan tombol Mic untuk memulai wawancara.';

  return (
    <div className="h-screen h-[100dvh] max-h-screen bg-[#F1F5F9] flex font-sans select-none overflow-hidden">
      {/* ─── Left Icon Rail (shell ruang meeting) ─── */}
      <aside className="hidden xl:flex w-[68px] shrink-0 flex-col items-center justify-between bg-white border-r border-slate-200 py-4">
        <div className="flex flex-col items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary-navy text-white flex items-center justify-center font-extrabold font-heading text-sm shadow-xs">
            T
          </div>
          <div className="h-px w-8 bg-slate-200 my-1" />
          <button
            onClick={() => navigate('/peserta')}
            title="Dashboard Peserta"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-primary-navy hover:bg-soft-blue transition-colors cursor-pointer"
          >
            <Home className="w-5 h-5" />
          </button>
          <div className="relative">
            <div
              title="Ruang Wawancara (aktif)"
              className="w-10 h-10 rounded-xl flex items-center justify-center bg-soft-blue text-primary-navy border border-accent-border"
            >
              <Video className="w-5 h-5" />
            </div>
            <span className="absolute -right-[9px] top-1.5 bottom-1.5 w-[3px] rounded-full bg-primary-navy" />
          </div>
          <button
            onClick={() => setChatOpen(true)}
            title="Transkrip Sesi"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-primary-navy hover:bg-soft-blue transition-colors cursor-pointer"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
          <button
            onClick={() => navigate('/peserta/device-check')}
            title="Cek Kamera & Mikrofon"
            className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-400 hover:text-primary-navy hover:bg-soft-blue transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-5 h-5" />
          </button>
        </div>
        <div className="w-9 h-9 rounded-full bg-soft-blue border border-accent-border text-[11px] font-extrabold text-primary-navy flex items-center justify-center">
          {sessionUser.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
        </div>
      </aside>

      {/* ─── Main Column ─── */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <header className="h-14 sm:h-16 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between gap-3 shrink-0 z-20">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <button
              onClick={() => navigate('/peserta')}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer shrink-0"
              title="Kembali ke Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xs sm:text-[15px] font-extrabold text-slate-900 font-heading truncate">
                  Wawancara Kompetensi • Live AI
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-soft-blue text-primary-navy border border-accent-border">
                  Gemini Live
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-mono truncate">
                {sessionUser.name} • {program.companyName} ({program.id})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200/80 px-2.5 sm:px-3 py-1 rounded-full text-rose-700 text-[11px] sm:text-xs font-mono font-bold">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span>REC • {formatTimer(sessionSeconds)}</span>
            </div>

            <div className={`hidden md:flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${isLiveConnected ? 'bg-emerald-50 border-emerald-200/80 text-emerald-800' : 'bg-amber-50 border-amber-200/80 text-amber-800'}`}>
              <span className={`w-2 h-2 rounded-full ${isLiveConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span>{isLiveConnected ? 'Terhubung ke Ava' : 'Menghubungkan...'}</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/peserta/device-check')}
              className="hidden sm:flex text-xs gap-1.5 cursor-pointer py-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-primary-navy" />
              <span>Status Anti-Cheat</span>
            </Button>
          </div>
        </header>

        {/* ─── Content: Stage + Controls + Side Panel ─── */}
        <div className="flex-1 min-h-0 flex flex-col xl:flex-row overflow-hidden p-2.5 sm:p-4 gap-3 sm:gap-4 bg-[#F1F5F9]">
          {/* Stage Column */}
          <div className="flex-1 min-h-0 flex flex-col gap-2.5 sm:gap-3">
            {/* Big Video Stage */}
            <div className="relative flex-1 min-h-0 bg-slate-900 rounded-2xl sm:rounded-3xl overflow-hidden shadow-sm border border-slate-800/40">
              {/* Candidate Camera Feed (main stage) */}
              {camOn ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  {!videoRef.current?.srcObject && savedFacePhoto && (
                    <img
                      src={savedFacePhoto}
                      alt="Wajah peserta"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                  {/* OpenCV scan overlay */}
                  <div className="absolute left-0 right-0 h-px bg-cyan-300/50 shadow-[0_0_14px_#22d3ee] animate-pulse pointer-events-none top-1/2 -translate-y-1/2" />
                  <div className="absolute inset-3 border border-emerald-300/25 rounded-xl pointer-events-none" />
                  <span className="absolute left-6 top-6 text-[9px] font-mono font-bold text-emerald-200/90 bg-black/35 px-1.5 py-0.5 rounded">
                    OpenCV AI • 30 FPS
                  </span>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900 text-slate-400">
                  <div className="w-20 h-20 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl font-extrabold text-slate-200">
                    {sessionUser.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                  </div>
                  <span className="text-xs font-semibold">Kamera Nonaktif</span>
                </div>
              )}

              {isSharing && (
                <video
                  ref={screenVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="absolute inset-0 w-full h-full object-contain bg-black z-10"
                />
              )}

              {/* Candidate name tag */}
              <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
                <span className="px-3 py-1 rounded-lg bg-black/45 backdrop-blur-md text-white text-[11px] font-bold border border-white/10">
                  Anda
                </span>
                {!micOn && (
                  <span className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[10px] font-bold flex items-center gap-1">
                    <MicOff className="w-3 h-3" />
                    Mute
                  </span>
                )}
              </div>

              {/* Participant Tiles */}
              <div className="absolute top-3 right-3 z-20 flex flex-col gap-2 w-[86px] sm:w-[112px]">
                {/* Ava */}
                <div
                  className={`relative rounded-xl overflow-hidden border-2 bg-primary-navy aspect-[4/3] flex flex-col items-center justify-center gap-1 ${
                    isAiSpeaking ? 'border-emerald-400' : 'border-white/20'
                  }`}
                >
                  <Sparkles className="w-5 h-5 text-white" />
                  <div className="flex items-end gap-[2px] h-4">
                    {[6, 10, 14, 8, 12].map((h, i) => (
                      <span
                        key={i}
                        className={`w-[2px] rounded-full ${
                          isAiSpeaking ? 'bg-emerald-300' : isListening ? 'bg-white/70' : 'bg-white/30'
                        }`}
                        style={{ height: `${isAiSpeaking ? h : 3}px` }}
                      />
                    ))}
                  </div>
                  <span className="text-[9px] font-bold text-white/90 tracking-wider">AVA</span>
                  <span
                    className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
                      isAiSpeaking || isListening ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-400'
                    }`}
                  />
                </div>

                {/* Sentinel AI Proctor */}
                <button
                  onClick={() => setShowProctor((v) => !v)}
                  title="Buka Sentinel AI Proctor"
                  className={`relative rounded-xl overflow-hidden border-2 bg-slate-900 aspect-[4/3] flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${
                    showProctor ? 'border-cyan-400' : 'border-white/20 hover:border-cyan-300/60'
                  }`}
                >
                  <ShieldCheck className="w-5 h-5 text-cyan-300" />
                  <span className="text-[9px] font-bold text-cyan-100 tracking-wider">SENTINEL</span>
                  <span
                    className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
                      proctorMood === 'warning' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
                    }`}
                  />
                </button>
              </div>

              {/* Sentinel panel (toggle from tile) */}
              {showProctor && (
                <div className="absolute left-3 top-14 z-30 w-[290px] max-w-[calc(100%-1.5rem)] max-h-[calc(100%-5rem)] overflow-y-auto">
                  <ProctoringCharacter
                    candidateName={sessionUser.name}
                    mood={proctorMood}
                    customMessage={proctorCustomMessage}
                    isListening={isListening}
                    isAiAnalyzing={isAiAnalyzing}
                  />
                  <button
                    type="button"
                    onClick={() => setShowProctor(false)}
                    className="mt-1.5 px-2.5 py-1 rounded-lg bg-black/60 hover:bg-black/75 text-white text-[10px] font-bold cursor-pointer"
                  >
                    Tutup Sentinel
                  </button>
                </div>
              )}

              {/* Mic error */}
              {micErrorMsg && (
                <div className="absolute bottom-16 left-3 right-3 sm:right-auto sm:max-w-sm z-30 p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-[11px] shadow-lg flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1.5">
                    <span className="font-semibold leading-relaxed block">{micErrorMsg}</span>
                    <button
                      onClick={handleStartListening}
                      className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] cursor-pointer"
                    >
                      Coba Akses Mic Lagi
                    </button>
                  </div>
                </div>
              )}

              {/* Status caption */}
              <div className="absolute bottom-3 left-3 right-3 sm:right-auto z-20">
                <div className="inline-flex items-center gap-2 max-w-full px-3.5 py-2 rounded-xl bg-black/50 backdrop-blur-md border border-white/10 text-white text-[11px] sm:text-xs font-semibold">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isAiSpeaking
                        ? 'bg-emerald-400 animate-pulse'
                        : isAiAnalyzing || isTranscribing
                        ? 'bg-amber-400 animate-pulse'
                        : isListening
                        ? 'bg-emerald-400'
                        : 'bg-slate-300'
                    }`}
                  />
                  <span className="truncate">{stageCaption}</span>
                </div>
              </div>
            </div>

            {/* Control Bar */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 px-2.5 sm:px-4 py-2 flex items-center gap-2 shrink-0 shadow-xs">
              {/* Mic level */}
              <div className="hidden lg:flex flex-col gap-1 w-28 shrink-0">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Volume</span>
                <div className="flex items-center gap-2">
                  <Mic className="w-3.5 h-3.5 text-primary-navy shrink-0" />
                  <div className="h-1.5 flex-1 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary-navy transition-all duration-150"
                      style={{ width: `${Math.min(100, Math.max(4, micVolumeLevel))}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 sm:gap-2 mx-auto overflow-x-auto max-w-full">
                {/* Mic */}
                {isListening ? (
                  isLiveConnected ? (
                    <div className="flex flex-col items-center gap-0.5 shrink-0">
                      <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center">
                        <Mic className="w-5 h-5" />
                      </div>
                      <span className="text-[9px] font-semibold text-emerald-700">Aktif</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-0.5 shrink-0">
                      <button
                        onClick={handleToggleListening}
                        className="w-11 h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-sm cursor-pointer animate-pulse"
                        title="Selesai Berbicara • Kirim ke Ava"
                      >
                        <Mic className="w-5 h-5" />
                      </button>
                      <span className="text-[9px] font-semibold text-rose-600">Kirim</span>
                    </div>
                  )
                ) : (
                  <div className="flex flex-col items-center gap-0.5 shrink-0">
                    <button
                      onClick={handleToggleListening}
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-sm cursor-pointer transition-colors ${
                        !hasStartedInterview
                          ? 'bg-primary-navy hover:bg-blue-800 text-white'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      }`}
                      title={!hasStartedInterview ? 'Mulai Wawancara (Nyalakan Mikrofon)' : 'Nyalakan Mikrofon & Mulai Bicara'}
                    >
                      {!hasStartedInterview ? <Play className="w-5 h-5 fill-white" /> : <Mic className="w-5 h-5" />}
                    </button>
                    <span className="text-[9px] font-semibold text-slate-500">
                      {!hasStartedInterview ? 'Mulai' : 'Bicara'}
                    </span>
                  </div>
                )}

                {/* Camera */}
                <div className="flex flex-col items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => setCamOn(!camOn)}
                    className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors cursor-pointer border ${
                      camOn
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                        : 'bg-rose-600 hover:bg-rose-700 text-white border-rose-600'
                    }`}
                    title={camOn ? 'Matikan Kamera' : 'Nyalakan Kamera'}
                  >
                    {camOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                  </button>
                  <span className="text-[9px] font-semibold text-slate-500">Kamera</span>
                </div>

                {/* Mute */}
                <div className="flex flex-col items-center gap-0.5 shrink-0">
                  <button
                    onClick={handleToggleMute}
                    className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors cursor-pointer border ${micOn ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200' : 'bg-rose-600 hover:bg-rose-700 text-white border-rose-600'}`}
                    title={micOn ? 'Matikan Mikrofon' : 'Nyalakan Mikrofon'}
                  >
                    {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                  </button>
                  <span className="text-[9px] font-semibold text-slate-500">Mute</span>
                </div>

                {/* Screen share */}
                <div className="flex flex-col items-center gap-0.5 shrink-0">
                  <button
                    onClick={handleToggleScreenShare}
                    className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors cursor-pointer border ${
                      isSharing
                        ? 'bg-primary-navy text-white border-primary-navy'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    }`}
                    title="Bagikan Layar"
                  >
                    <Share2 className="w-5 h-5" />
                  </button>
                  <span className="text-[9px] font-semibold text-slate-500">Layar</span>
                </div>

                {/* Transcript */}
                <div className="flex flex-col items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => setChatOpen(!chatOpen)}
                    className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors cursor-pointer border ${
                      chatOpen
                        ? 'bg-primary-navy text-white border-primary-navy'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                    }`}
                    title="Buka Transkrip Sesi"
                  >
                    <MessageSquare className="w-5 h-5" />
                  </button>
                  <span className="text-[9px] font-semibold text-slate-500">Transkrip</span>
                </div>

                {/* Ava voice */}
                <div className="flex flex-col items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => {
                      setTtsEnabled(!ttsEnabled);
                      if (isAiSpeaking) window.speechSynthesis?.cancel();
                    }}
                    className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors cursor-pointer border ${
                      ttsEnabled
                        ? 'bg-slate-100 hover:bg-slate-200 text-primary-navy border-slate-200'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-400 border-slate-200'
                    }`}
                    title={ttsEnabled ? 'Suara Ava Aktif' : 'Suara Ava Senyap'}
                  >
                    {ttsEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
                  </button>
                  <span className="text-[9px] font-semibold text-slate-500">Suara AI</span>
                </div>

                {/* Replay question */}
                <div className="flex flex-col items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => speakTextWithNeuralVoice(activeQuestion.question)}
                    className="w-11 h-11 rounded-xl flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                    title="Dengarkan Ulang Soal"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>
                  <span className="text-[9px] font-semibold text-slate-500">Ulangi</span>
                </div>
              </div>

              {/* Leave */}
              <button
                onClick={() => {
                  void saveInterviewResults(questions);
                  navigate('/peserta/hasil');
                }}
                className="shrink-0 flex items-center gap-2 px-3 sm:px-4 h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[11px] sm:text-xs font-bold shadow-sm transition-colors cursor-pointer"
                title="Akhiri Sesi Wawancara"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Akhiri</span>
              </button>
            </div>
          </div>

        {/* ─── Right Side Panel: Interactive Live Questions & Transcript ─── */}
        <div className="w-full xl:w-[364px] shrink-0 bg-white rounded-2xl sm:rounded-3xl border border-slate-200 flex flex-col overflow-hidden shadow-xs max-h-[46vh] xl:max-h-none">
          {/* Tabs: Pertanyaan vs Chat Transkrip */}
          <div className="p-2.5 bg-slate-50 border-b border-slate-200 flex gap-1.5">
            <button
              onClick={() => setChatOpen(false)}
              className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                !chatOpen
                  ? 'bg-white text-primary-navy shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Brain className="w-4 h-4 text-blue-600" />
              <span>Pertanyaan Sesi</span>
            </button>
            <button
              onClick={() => setChatOpen(true)}
              className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                chatOpen
                  ? 'bg-white text-primary-navy shadow-xs border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="w-4 h-4 text-blue-600" />
              <span>Transkrip Sesi ({messages.length})</span>
            </button>
          </div>

          {!chatOpen ? (
            /* Pertanyaan & Interactive Answer Form */
            <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
              {/* Active Question Highlight Card */}
              <div className="p-4 rounded-2xl bg-primary-navy text-white space-y-2.5 shadow-sm">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider">
                  <span className="text-blue-100 font-mono">
                    Soal #{activeQuestion.id} dari {questions.length}
                  </span>
                  <span className="bg-white/15 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">
                    Live Gemini
                  </span>
                </div>

                <p className="text-white text-xs sm:text-sm font-bold leading-relaxed">
                  "{activeQuestion.question}"
                </p>

                <div className="pt-2 text-[11px] flex items-center justify-between gap-2 border-t border-white/15">
                  <span className="font-semibold text-blue-100">{activeQuestion.competency}</span>
                  <span className="font-mono text-blue-200 shrink-0">Bobot: {activeQuestion.weight}</span>
                </div>

                <button
                  type="button"
                  onClick={() => speakTextWithNeuralVoice(activeQuestion.question)}
                  className="w-full mt-0.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Dengarkan Ulang Soal #{activeQuestion.id}</span>
                </button>
              </div>

              {/* Standar Rubrik BARS untuk Pertanyaan Aktif */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-blue-600" />
                    Rubrik Penilaian BARS Asesor:
                  </span>
                  <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-bold">
                    Standar BARS
                  </span>
                </div>
                <div className="space-y-1 text-[11px] text-slate-600">
                  <div className="p-2 rounded-xl bg-white border border-slate-200/80 flex items-start gap-1.5">
                    <span className="text-emerald-600 font-bold">Level 5 (4.8 - 5.0):</span>
                    <span>Arsitektur sistemik komprehensif, mitigasi risiko operasional, idempotensi &amp; trade-offs.</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-slate-200/80 flex items-start gap-1.5">
                    <span className="text-blue-600 font-bold">Level 4 (4.0 - 4.7):</span>
                    <span>Pendekatan teknis benar, standar industri, pemahaman operasional solid.</span>
                  </div>
                </div>

                {/* Quick Answer Suggestion Helper for Demo */}
                {activeQuestion.sampleAnswer && (
                  <button
                    type="button"
                    onClick={() => {
                      setUserAnswer(activeQuestion.sampleAnswer || '');
                      setLiveInterimText(activeQuestion.sampleAnswer || '');
                      setProctorCustomMessage('Contoh argumen disisipkan. Jawaban akan dinilai otomatis setelah giliran Anda selesai.');
                    }}
                    className="w-full text-center py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 font-bold text-xs cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <span>💡 Gunakan Contoh Jawaban Demo</span>
                  </button>
                )}
              </div>

              {/* Emergency Collapsible Manual Text Input */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/80">
                <button
                  type="button"
                  onClick={() => setShowManualInput(!showManualInput)}
                  className="w-full p-2.5 text-left text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Keyboard className="w-3.5 h-3.5 text-slate-500" />
                    <span>Mikrofon bermasalah? Ketik jawaban manual</span>
                  </span>
                  <span className="text-[10px] text-blue-600 font-bold">{showManualInput ? '▲ Tutup' : '▼ Buka'}</span>
                </button>
                {showManualInput && (
                  <div className="p-3 border-t border-slate-200 bg-white space-y-2 animate-in fade-in duration-150">
                    <textarea
                      rows={3}
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      placeholder="Ketik argumen teknis Anda di sini jika mikrofon perangkat bermasalah..."
                      className="w-full p-2.5 rounded-xl border border-slate-200 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 text-xs text-slate-800 outline-none"
                    />
                    <Button
                      variant="primary"
                      onClick={() => submitAnswerTurn(userAnswer)}
                      disabled={!userAnswer.trim() || isAiAnalyzing || isTranscribing}
                      className="w-full py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Kirim Jawaban Teks</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Question Timeline / Completed List */}
              <div className="space-y-2 pt-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Daftar Pertanyaan Ujian:
                </span>
                {questions.map((q) => (
                  <div
                    key={q.id}
                    className={`p-3 rounded-xl border transition-all text-xs space-y-1.5 ${
                      q.status === 'completed'
                        ? 'bg-emerald-50/70 border-emerald-200'
                        : q.status === 'active'
                        ? 'bg-blue-50/60 border-blue-300 font-semibold'
                        : 'bg-white border-slate-200/80 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-800">
                        Soal #{q.id}: {q.competency}
                      </span>
                      {q.status === 'completed' && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold font-mono">
                          ✓ BARS: {q.score} / 5.0
                        </span>
                      )}
                      {q.status === 'active' && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white font-bold font-mono">
                          Sedang Diuji
                        </span>
                      )}
                    </div>
                    {q.rubricLevel && (
                      <p className="text-[10px] font-bold text-emerald-700 bg-white/70 px-2 py-0.5 rounded border border-emerald-200/60 inline-block">
                        {q.rubricLevel}
                      </p>
                    )}
                    {q.rubricCriteria && q.rubricCriteria.length > 0 && (
                      <div className="space-y-0.5 pt-0.5">
                        {q.rubricCriteria.map((crit, cIdx) => (
                          <div key={cIdx} className="flex items-start gap-1 text-[10px] text-emerald-900 font-normal">
                            <span className="text-emerald-500 font-bold">✓</span>
                            <span>{crit}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {q.aiFeedback && (
                      <p className="text-[11px] text-emerald-800 leading-relaxed pt-0.5 font-normal">
                        {q.aiFeedback}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Live Transcript / Dialogue Panel */
            <div className="flex-1 flex flex-col justify-between overflow-hidden">
              <div className="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
                {messages.map((m, idx) => {
                  const isAva = m.sender === 'Gemini Live';
                  const isCandidate = m.sender === 'Kandidat (Anda)';
                  const initials = isAva
                    ? 'AI'
                    : m.sender
                        .split(' ')
                        .map((w) => w[0])
                        .slice(0, 2)
                        .join('');
                  const bubble = isAva
                    ? 'bg-slate-50 text-slate-800 border border-slate-200 rounded-tl-md'
                    : isCandidate
                    ? 'bg-primary-navy text-white border border-primary-navy rounded-tr-md'
                    : 'bg-slate-50 text-slate-500 border border-dashed border-slate-200 text-[11px]';
                  return (
                    <div
                      key={idx}
                      className={`flex items-start gap-2 ${isCandidate ? 'flex-row-reverse' : ''}`}
                    >
                      <div
                        className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-extrabold border ${
                          isAva
                            ? 'bg-soft-blue text-primary-navy border-accent-border'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {initials}
                      </div>
                      <div className={`min-w-0 max-w-[80%] space-y-1 ${isCandidate ? 'text-right' : ''}`}>
                        <div
                          className={`flex items-center gap-2 text-[10px] text-slate-400 ${
                            isCandidate ? 'justify-end' : ''
                          }`}
                        >
                          <span className={`font-bold ${isAva ? 'text-primary-navy' : 'text-slate-600'}`}>
                            {isAva ? 'Ava' : m.sender}
                          </span>
                          <span className="font-mono">{m.time}</span>
                        </div>
                        <div className={`p-3 rounded-2xl text-xs sm:text-[13px] leading-relaxed text-left ${bubble}`}>
                          {m.text}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Live candidate speech (belum terkirim) — hanya tampil di panel transkrip */}
                {isListening && (liveInterimText || userAnswer) && (
                  <div className="flex items-start gap-2 flex-row-reverse">
                    <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[10px] font-extrabold bg-slate-100 text-slate-600 border border-slate-200">
                      {sessionUser.name.split(' ').map((w) => w[0]).slice(0, 2).join('')}
                    </div>
                    <div className="min-w-0 max-w-[80%] space-y-1 text-right">
                      <div className="flex items-center justify-end gap-2 text-[10px] text-slate-400">
                        <span className="font-bold text-slate-600">Kandidat (Anda)</span>
                        <span className="font-mono flex items-center gap-1 text-emerald-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          live
                        </span>
                      </div>
                      <div className="p-3 rounded-2xl text-xs sm:text-[13px] leading-relaxed bg-primary-navy/90 text-white border border-primary-navy text-left italic">
                        {liveInterimText || userAnswer}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={handleSendChatMessage} className="p-3 border-t border-slate-200 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ketik catatan sesi wawancara..."
                  className="flex-1 bg-slate-50 px-4 py-2.5 rounded-xl text-xs sm:text-sm outline-none text-slate-800 border border-slate-200 focus:border-primary-navy"
                />
                <button
                  type="submit"
                  className="p-2.5 rounded-xl bg-primary-navy text-white hover:bg-blue-700 cursor-pointer shadow-xs"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

    </div>

      {/* ─── Completion Modal ─── */}
      <Modal
        isOpen={isCompletedModalOpen}
        onClose={() => setIsCompletedModalOpen(false)}
        title="🎉 Sesi Wawancara AI Berhasil Diselesaikan!"
        size="md"
      >
        <div className="space-y-5 text-center p-2">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-500 text-white flex items-center justify-center shadow-lg">
            <Award className="w-9 h-9" />
          </div>

          <div>
            <h3 className="text-lg font-extrabold text-slate-900 font-heading">
              Selamat, {sessionUser.name}!
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Seluruh 4 butir pertanyaan wawancara kompetensi terstandar BARS telah selesai dievaluasi oleh Gemini Live AI.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-around">
            <div>
              <p className="text-[10px] uppercase font-bold text-emerald-700">Rata-Rata BARS</p>
              <p className="font-mono text-2xl font-extrabold text-emerald-900">{avgBearsScore} / 5.0</p>
            </div>
            <div className="h-8 w-px bg-emerald-200" />
            <div>
              <p className="text-[10px] uppercase font-bold text-emerald-700">Status Rekomendasi</p>
              <p className="font-bold text-xs text-blue-800">MENUNGGU VERIFIKASI ASESOR</p>
            </div>
          </div>

          <div className="flex gap-2.5 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsCompletedModalOpen(false)}
              className="flex-1 text-xs sm:text-sm py-2.5 rounded-xl cursor-pointer"
            >
              Tinjau Transkrip
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate('/peserta/hasil')}
              className="flex-1 text-xs sm:text-sm py-2.5 rounded-xl font-bold cursor-pointer bg-emerald-600 hover:bg-emerald-700"
            >
              Lihat Rekap Hasil LHA →
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
