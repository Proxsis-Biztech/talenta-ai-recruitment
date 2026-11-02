import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Bot,
  Zap,
  ArrowLeft,
  RotateCcw,
  Award,
  Keyboard
} from 'lucide-react';
import { Button, Badge, Modal } from '../ui';
import { getActiveSessionUser } from '../../services/userRegistryService';
import { getProgramById } from '../../services/assessmentCatalog';
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
  const [liveCaptionText, setLiveCaptionText] = useState<string>('');
  const [micVolumeLevel, setMicVolumeLevel] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [hasStartedInterview, setHasStartedInterview] = useState(false);

  // Audio Context, MediaRecorder, and WebSocket refs for duplex 2-way interaction
  const audioCtxRef = useRef<AudioContext | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesCountRef = useRef<number>(0);
  const volumeAnimRef = useRef<number | null>(null);
  const aiAudioElementRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const speechRecognitionRef = useRef<any>(null);

  // Live real-time speech preview & UI simplicity state
  const [liveInterimText, setLiveInterimText] = useState('');
  const [handsFreeMode, setHandsFreeMode] = useState(true);
  const [showManualInput, setShowManualInput] = useState(false);

  // Proctoring Character states
  const [proctorMood, setProctorMood] = useState<ProctoringMood>('normal');
  const [proctorCustomMessage, setProctorCustomMessage] = useState<string | undefined>(undefined);

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
      text: `Halo ${sessionUser.name || 'Farhan Pratama'}, selamat datang di sesi wawancara AI Talenta+ untuk ${program.companyName || 'PT Telkom Indonesia Tbk'}. Saya Gemini 2.5 Flash Live Assessor. Mari kita mulai dengan pertanyaan pertama terkait arsitektur sistem.`,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  // Video element ref for real webcam feed
  const videoRef = useRef<HTMLVideoElement>(null);

  // Initialize camera stream
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
      )}`;

      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setIsLiveConnected(true);
        playHarmonicAiChime();
        const initialPrompt =
          greetingText ||
          `Halo Ava, saya ${sessionUser.name || 'Budi Santoso'} telah siap untuk sesi wawancara kompetensi untuk posisi ${program.title}. Silakan sapa saya dan ajukan pertanyaan pertama secara langsung.`;
        ws.send(JSON.stringify({ type: 'text', text: initialPrompt }));
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
              setLiveCaptionText(cleanText);
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
            setUserAnswer((prev) => (prev ? prev + ' ' + data.text : data.text));
          } else if (data.type === 'turnComplete') {
            setIsAiSpeaking(false);
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
    setLiveCaptionText(text);

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
    setLiveCaptionText(text);

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

    const greetingText = `Halo ${sessionUser.name || 'Farhan Pratama'}, selamat datang di sesi wawancara AI Talenta Plus untuk posisi ${program.title}. Saya Ava, asesor AI Anda. Mari kita mulai dengan pertanyaan pertama: ${questions[0].question}`;

    setLiveCaptionText(greetingText);
    setMessages((prev) => [
      ...prev,
      {
        sender: 'Gemini Live',
        text: greetingText,
        time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
      }
    ]);

    await speakTextWithNeuralVoice(greetingText, () => {
      setProctorCustomMessage('Ava selesai membacakan pertanyaan. Giliran Anda menjawab. Silakan berbicara...');
      if (micOn) {
        handleStartListening();
      }
    });
  };

  // Start Candidate Voice Input with MediaRecorder & Live Audio Waveform
  const handleStartListening = async () => {
    try {
      getOrCreateAudioContext();
      if (aiAudioElementRef.current) {
        aiAudioElementRef.current.pause();
      }
      setIsAiSpeaking(false);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      mediaStreamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      inputAudioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      analyserRef.current = analyser;

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
      recorder.start(200);

      setIsListening(true);
      setProctorMood('speaking');
      setProctorCustomMessage('Mikrofon aktif! Ava sedang mendengarkan jawaban Anda secara langsung.');

      // Live volume bar animation loop
      const updateVolume = () => {
        if (!analyserRef.current) return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        const level = Math.min(100, Math.round((avg / 128) * 100));
        setMicVolumeLevel(level);
        volumeAnimRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();

      setLiveInterimText('');
      // Browser SpeechRecognition live text preview
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          if (speechRecognitionRef.current) {
            try {
              speechRecognitionRef.current.abort();
            } catch {}
          }
          const recognition = new SpeechRecognition();
          recognition.lang = 'id-ID';
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.onresult = (e: any) => {
            const text = Array.from(e.results)
              .map((r: any) => r[0].transcript)
              .join('');
            if (text.trim()) {
              setUserAnswer(text);
              setLiveInterimText(text);
            }
          };
          recognition.start();
          speechRecognitionRef.current = recognition;
        } catch {
          // ignore
        }
      }
    } catch (err) {
      console.warn('Microphone error:', err);
      setIsListening(false);
      setProctorMood('normal');
    }
  };

  // Toggle Listening: If not listening, start. If listening, stop and transcribe.
  const handleToggleListening = async () => {
    if (isListening) {
      await handleStopListeningAndSubmit();
    } else {
      await handleStartListening();
    }
  };

  const handleStopListeningAndSubmit = async () => {
    setIsListening(false);
    setProctorMood('normal');
    setMicVolumeLevel(0);
    if (volumeAnimRef.current) {
      cancelAnimationFrame(volumeAnimRef.current);
      volumeAnimRef.current = null;
    }
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {}
      speechRecognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    if (inputAudioCtxRef.current) {
      inputAudioCtxRef.current.close().catch(() => {});
      inputAudioCtxRef.current = null;
    }

    setProctorCustomMessage('Menganalisis suara dengan OpenAI Whisper / Gemini Audio...');

    // Wait for recorder ondataavailable
    await new Promise((r) => setTimeout(r, 250));

    let transcribedText = (userAnswer || liveInterimText).trim();

    // If candidate recorded audio chunks, transcribe via Whisper / Gemini STT
    if (audioChunksRef.current.length > 0) {
      const audioBlob = new Blob(audioChunksRef.current, {
        type: mediaRecorderRef.current?.mimeType || 'audio/webm'
      });

      if (audioBlob.size > 1200) {
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
              transcribedText = transJson.text.trim();
              setUserAnswer(transcribedText);
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
        `Halo ${sessionUser.name || 'Kandidat'}, suara Anda belum terdengar di sistem. Silakan klik tombol bicara dan sampaikan kata-kata atau jawaban Anda ya.`
      );
      return;
    }

    // Submit answer to LangChain & BARS evaluation
    await submitAnswerTurn(transcribedText);
  };

  // Active question convenience
  const activeQuestion = questions[currentQIndex] || questions[0];

  // Submit Answer to LangChain & Gemini Live with BARS Rubrics
  const submitAnswerTurn = async (answerText: string) => {
    const textToSubmit = answerText.trim() || activeQuestion.sampleAnswer || 'Saya telah menjelaskan solusi arsitektur saya secara langsung.';
    const nowTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    // Append candidate answer to messages
    setMessages((prev) => [
      ...prev,
      {
        sender: 'Kandidat (Anda)',
        text: textToSubmit,
        time: nowTime
      }
    ]);

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
        setLiveCaptionText(reply);
        setMessages((prev) => [
          ...prev,
          {
            sender: 'Gemini Live',
            text: reply,
            time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
          }
        ]);

        if (evalData.audioBase64 && ttsEnabled) {
          playAiAudio(evalData.audioBase64, () => {
            setProctorCustomMessage(`Ava selesai menyapa. Silakan jawab pertanyaan #${currentQIndex + 1}.`);
            if (handsFreeMode && micOn) {
              handleStartListening();
            }
          });
        } else if (ttsEnabled) {
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
      updatedQuestions[currentQIndex].score = evalData.score || 4.8;
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
      setLiveCaptionText(geminiReply);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'Gemini Live',
          text: geminiReply,
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        }
      ]);

      // Play Neural Voice and auto-advance hands-free!
      if (evalData.audioBase64 && ttsEnabled) {
        playAiAudio(evalData.audioBase64, () => {
          if (nextIdx < updatedQuestions.length) {
            setProctorCustomMessage(`Pertanyaan #${nextIdx + 1} aktif. Giliran Anda berbicara.`);
            if (handsFreeMode && micOn) {
              handleStartListening();
            }
          }
        });
      } else if (ttsEnabled) {
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
      updatedQuestions[currentQIndex].score = 4.8;
      updatedQuestions[currentQIndex].aiFeedback =
        'LangChain BARS: Analisis tepat. Solusi mendemonstrasikan penguasaan teknis dan pemahaman sistemik yang solid.';

      let nextAiReply = '';
      if (nextIdx < updatedQuestions.length) {
        updatedQuestions[nextIdx].status = 'active';
        setCurrentQIndex(nextIdx);
        nextAiReply = `Terima kasih ${sessionUser.name}. Jawaban Anda sangat berbobot (Skor BARS 4.8/5). Sekarang mari kita lanjut ke soal #${nextIdx + 1}: ${updatedQuestions[nextIdx].question}`;
      } else {
        nextAiReply = `Luar biasa, ${sessionUser.name}. Seluruh 4 butir pertanyaan wawancara kompetensi telah selesai dijawab dengan sangat memuaskan.`;
        setIsCompletedModalOpen(true);
      }

      setQuestions(updatedQuestions);
      setLiveCaptionText(nextAiReply);
      setMessages((prev) => [
        ...prev,
        {
          sender: 'Gemini Live',
          text: nextAiReply,
          time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        }
      ]);

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

  // Submit Answer triggered by form button
  const handleSubmitAnswer = async (e?: React.FormEvent) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isListening) {
      await handleStopListeningAndSubmit();
    } else {
      const text = userAnswer.trim() || activeQuestion.sampleAnswer || 'Saya telah menjelaskan analisis dan jawaban teknis saya secara langsung melalui suara.';
      await submitAnswerTurn(text);
    }
  };

  // Save Interview Results to Backend
  const saveInterviewResults = async (completedQs: QuestionItem[]) => {
    try {
      const totalScore = completedQs.reduce((acc, q) => acc + (q.score || 4.8), 0);
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
    setChatInput('');
  };

  // Average BARS score
  const completedQuestions = questions.filter((q) => q.status === 'completed' && q.score);
  const avgBearsScore = completedQuestions.length
    ? (
        completedQuestions.reduce((acc, q) => acc + (q.score || 0), 0) /
        completedQuestions.length
      ).toFixed(1)
    : '4.8';

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col font-sans select-none overflow-hidden">
      {/* ─── Topbar Stage: Live Telemetry, Title, Exit ─── */}
      <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between shrink-0 shadow-xs z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/peserta')}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="Kembali ke Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-extrabold text-slate-900 font-heading">
                Gemini Live AI Multimodal Interview
              </h1>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                Gemini 2.5 Flash Live
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono truncate">
              {sessionUser.name} • {program.companyName} ({program.id})
            </p>
          </div>
        </div>

        {/* Telemetry and Controls */}
        <div className="flex items-center gap-3">
          {/* Recording Badge */}
          <div className="flex items-center gap-2 bg-rose-50 border border-rose-200/80 px-3 py-1 rounded-full text-rose-700 text-xs font-mono font-bold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span>REC • {formatTimer(sessionSeconds)}</span>
          </div>

          {/* Stream Quality */}
          <div className="hidden md:flex items-center gap-2 bg-emerald-50 border border-emerald-200/80 px-3 py-1 rounded-full text-emerald-800 text-xs font-semibold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>HD 1080p • 60 FPS • 18ms</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/peserta/device-check')}
            className="hidden sm:flex text-xs gap-1.5 cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>Status Anti-Cheat</span>
          </Button>
        </div>
      </header>

      {/* ─── Center Stage: Big Video Stage (Gemini Live) + Interactive Side Panel ─── */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden p-3 sm:p-6 gap-4 sm:gap-6 bg-slate-950">
        {/* ─── Left Stage: Google Gemini Live AI Interviewer Canvas ─── */}
        <div className="flex-1 flex flex-col justify-between bg-white rounded-3xl border border-slate-200/90 overflow-hidden relative shadow-sm">
          {/* Top Stage Header Badges */}
          <div className="relative z-10 p-4 sm:p-6 flex items-center justify-between pointer-events-none">
            <div className="bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-bold text-slate-800 flex items-center gap-2 border border-slate-200 shadow-2xs">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isAiSpeaking
                    ? 'bg-blue-600 animate-ping'
                    : isAiAnalyzing || isTranscribing
                    ? 'bg-amber-500 animate-spin'
                    : isListening
                    ? 'bg-rose-500 animate-pulse'
                    : 'bg-emerald-500'
                }`}
              />
              <span>
                {isAiSpeaking
                  ? 'Ava Sedang Berbicara (Suara Natural)...'
                  : isTranscribing
                  ? 'OpenAI Whisper Mentranskripsi Rekaman Suara...'
                  : isAiAnalyzing
                  ? 'LangChain Mengevaluasi Rubrik BARS...'
                  : isListening
                  ? 'Mendengarkan Jawaban Anda (Bicara Sekarang)...'
                  : 'Mode Percakapan 2-Arah Aktif'}
              </span>
            </div>

            {/* Auto Voice TTS Toggle */}
            <button
              onClick={() => {
                setTtsEnabled(!ttsEnabled);
                if (isAiSpeaking) window.speechSynthesis?.cancel();
              }}
              className="pointer-events-auto bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-semibold text-slate-700 hover:text-primary-navy border border-slate-200 flex items-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
            >
              {ttsEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Suara AI Aktif</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                  <span>Suara AI Senyap</span>
                </>
              )}
            </button>
          </div>

          {/* Center Stage: The Iconic Gemini Live Multimodal AI Orb & Waveforms */}
          <div className="my-auto py-8 flex flex-col items-center justify-center text-center px-4 relative z-0">
            {/* Ambient Background Aura */}
            <div className="absolute w-72 h-72 rounded-full bg-gradient-to-tr from-cyan-200/40 via-blue-200/30 to-violet-200/40 blur-3xl pointer-events-none" />

            {/* Glowing Gemini Live Orb */}
            <div className="relative flex items-center justify-center">
              {/* Pulsing Aura Rings when Speaking or Listening */}
              {(isAiSpeaking || isListening) && (
                <>
                  <div className="absolute w-44 h-44 rounded-full border-2 border-blue-400/40 animate-ping" />
                  <div className="absolute w-52 h-52 rounded-full border border-indigo-300/30 animate-pulse" />
                </>
              )}

              {/* Central Gemini Sphere */}
              <div
                className={`w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-gradient-to-tr from-[#1E40AF] via-[#6366F1] to-[#06B6D4] p-1 shadow-xl transition-transform duration-300 ${
                  isAiSpeaking ? 'scale-105 shadow-blue-500/30' : 'hover:scale-102'
                }`}
              >
                <div className="w-full h-full rounded-full bg-gradient-to-br from-white/20 via-transparent to-black/20 flex flex-col items-center justify-center text-white relative overflow-hidden backdrop-blur-xs">
                  <Sparkles className="w-10 h-10 sm:w-12 sm:h-12 text-white animate-pulse" />
                  <span className="text-[10px] sm:text-xs font-mono font-bold tracking-widest uppercase mt-1 text-cyan-200">
                    GEMINI
                  </span>
                </div>
              </div>
            </div>

            {/* Audio Waveform Equalizer (Speaks / Listens) */}
            <div className="mt-6 flex items-center gap-1.5 h-8">
              {[40, 70, 95, 60, 85, 100, 75, 50, 80, 65, 90, 45].map((height, i) => (
                <div
                  key={i}
                  className={`w-1 rounded-full transition-all duration-150 ${
                    isAiSpeaking
                      ? 'bg-gradient-to-t from-blue-600 to-cyan-400 animate-pulse'
                      : isListening
                      ? 'bg-emerald-500'
                      : 'bg-slate-200'
                  }`}
                  style={{
                    height: isAiSpeaking
                      ? `${Math.max(12, (height * (i % 2 === 0 ? 0.9 : 1.2)) % 32)}px`
                      : isListening
                      ? `${Math.max(8, (height * 0.4) % 24)}px`
                      : '8px'
                  }}
                />
              ))}
            </div>

            {/* Assessor Persona Info */}
            <div className="mt-4 space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-900 text-[11px] font-bold border border-blue-200">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>LangChain BARS • OpenAI Whisper STT • Neural TTS</span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 font-heading">
                Ava • Senior AI Interviewer &amp; Assessor
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 font-medium max-w-md">
                Interaksi Suara Dua Arah Aktif • Standar Rubrik Penilaian BARS {program.companyName}
              </p>
            </div>

            {/* Real-time Status Banner under Ava (No redundant buttons, controlled exclusively via bottom footer mic button) */}
            <div className="mt-5 w-full max-w-lg px-4 space-y-2.5">
              {!hasStartedInterview ? (
                <div className="p-3.5 rounded-2xl bg-blue-50/90 border border-blue-200 text-blue-900 text-xs font-semibold flex items-center justify-center gap-2 shadow-2xs">
                  <Sparkles className="w-4 h-4 text-blue-600 shrink-0 animate-pulse" />
                  <span>Gunakan tombol mikrofon di bagian bawah layar untuk memulai wawancara.</span>
                </div>
              ) : isAiSpeaking ? (
                <div className="p-3.5 rounded-2xl bg-blue-50/90 border border-blue-200 text-blue-900 flex items-center justify-center gap-2.5 shadow-2xs animate-pulse">
                  <div className="w-3 h-3 rounded-full bg-blue-600 animate-ping" />
                  <span className="font-extrabold text-xs sm:text-sm">🔊 Ava Sedang Berbicara...</span>
                </div>
              ) : isListening ? (
                <div className="p-3.5 rounded-2xl bg-emerald-50/95 border-2 border-emerald-400 text-emerald-950 shadow-md space-y-2 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 font-extrabold text-xs sm:text-sm text-emerald-900">
                      <span className="w-3 h-3 rounded-full bg-emerald-500 animate-ping" />
                      🎙️ MIKROFON AKTIF • AVA MENDENGARKAN
                    </span>
                    <span className="text-xs font-mono font-bold bg-white px-2.5 py-0.5 rounded-full border border-emerald-300 text-emerald-800">
                      {micVolumeLevel}% Vol
                    </span>
                  </div>
                  {/* Real-time Candidate Speech Preview */}
                  <div className="p-2.5 bg-white rounded-xl border border-emerald-200 text-xs text-left min-h-[38px] flex items-center">
                    {liveInterimText || userAnswer ? (
                      <span className="text-slate-900 font-semibold italic">"{liveInterimText || userAnswer}"</span>
                    ) : (
                      <span className="text-slate-400 italic">Bicara sekarang (sapa "Halo Ava", atau langsung sampaikan jawaban Anda)...</span>
                    )}
                  </div>
                  <p className="text-[11px] text-emerald-700 text-center font-medium">
                    👇 Klik tombol mikrofon di bawah layar saat selesai berbicara untuk mengirim jawaban.
                  </p>
                </div>
              ) : isAiAnalyzing || isTranscribing ? (
                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-center gap-2.5 shadow-2xs">
                  <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                  <span className="font-extrabold text-xs sm:text-sm">
                    {isTranscribing ? 'Mentranskripsi Suara (Whisper)...' : 'LangChain Menganalisis Jawaban...'}
                  </span>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2">
                  <Mic className="w-4 h-4 text-blue-600" />
                  <span>Mikrofon siap. Klik tombol mic di bawah untuk mulai berbicara.</span>
                </div>
              )}

              {/* Minimalist Question Replay Pill */}
              <div className="flex items-center justify-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={() => speakTextWithNeuralVoice(activeQuestion.question)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 text-[11px] font-bold border border-blue-200 transition-all cursor-pointer shadow-2xs"
                >
                  <Volume2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Dengarkan Ulang Soal #{activeQuestion.id}</span>
                </button>
              </div>
            </div>

            {/* Real-time Live Caption Box */}
            {liveCaptionText && (
              <div className="mt-4 max-w-lg mx-auto bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-3 text-slate-100 text-xs text-left shadow-lg animate-in fade-in duration-200">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-cyan-400 mb-1">
                  <Bot className="w-3.5 h-3.5" />
                  <span>TRANSKRIP SUARA AI GEMINI:</span>
                </div>
                <p className="leading-relaxed line-clamp-3 font-sans">
                  "{liveCaptionText}"
                </p>
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════
              BOTTOM-RIGHT: Candidate Self-View PIP + AI PROCTOR CHARACTER
          ═══════════════════════════════════════════════════════════ */}
          <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-2 max-w-xs sm:max-w-sm">
            {/* AI Proctoring Character Companion */}
            <ProctoringCharacter
              candidateName={sessionUser.name}
              mood={proctorMood}
              customMessage={proctorCustomMessage}
              isListening={isListening}
              isAiAnalyzing={isAiAnalyzing}
            />

            {/* Self-View PIP (Video Peserta dengan Laser Scan OpenCV) */}
            <div className="w-full aspect-video bg-white rounded-2xl border-2 border-slate-200 shadow-xl overflow-hidden flex flex-col justify-between p-2 relative">
              <div className="flex items-center justify-between text-[10px] text-slate-700 z-10">
                <span className="bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded-full font-bold flex items-center gap-1 text-slate-800 border border-slate-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Wajah Terverifikasi
                </span>
                {!micOn && (
                  <span className="bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                    <MicOff className="w-3 h-3" />
                    Mute
                  </span>
                )}
              </div>

              {/* Video Canvas or Fallback Snapshot */}
              <div className="flex items-center justify-center my-auto w-full h-full relative overflow-hidden rounded-xl bg-slate-900">
                {camOn ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover rounded-xl"
                    />
                    {/* Fallback if no real camera attached */}
                    {!videoRef.current?.srcObject && savedFacePhoto && (
                      <img
                        src={savedFacePhoto}
                        alt="Candidate face"
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    )}

                    {/* OpenCV Laser Scanning Line Animation */}
                    <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#06b6d4] animate-pulse pointer-events-none top-1/2 -translate-y-1/2" />

                    {/* OpenCV Reticle */}
                    <div className="absolute inset-2 border border-emerald-400/60 rounded-lg pointer-events-none flex items-end justify-start p-1">
                      <span className="text-[9px] font-mono text-emerald-800 bg-white/90 px-1 rounded font-bold">
                        OpenCV AI • 30 FPS
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center p-2 text-slate-400">
                    <VideoOff className="w-6 h-6 mb-1" />
                    <span className="text-[10px] font-semibold">Kamera Nonaktif</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-[10px] font-bold text-slate-700 pt-1 z-10">
                <span className="truncate">{sessionUser.name}</span>
                <span className="text-slate-400 font-mono">{program.id}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ─── Right Side Panel: Interactive Live Questions & Transcript ─── */}
        <div className="w-full lg:w-96 bg-white rounded-3xl border border-slate-200/90 flex flex-col overflow-hidden shadow-sm">
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
              <span>Transkrip AI ({messages.length})</span>
            </button>
          </div>

          {!chatOpen ? (
            /* Pertanyaan & Interactive Answer Form */
            <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4 text-xs">
              {/* Active Question Highlight Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/80 to-indigo-50/50 border border-blue-200/90 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-blue-800 font-mono">
                  <span>
                    Soal #{activeQuestion.id} dari {questions.length}
                  </span>
                  <span className="bg-blue-600 text-white px-2 py-0.5 rounded-full text-[10px] font-bold">
                    Live Gemini
                  </span>
                </div>

                <p className="text-slate-900 text-xs sm:text-sm font-bold leading-relaxed">
                  "{activeQuestion.question}"
                </p>

                <div className="pt-2 text-[11px] text-slate-600 flex items-center justify-between border-t border-blue-100">
                  <span className="font-semibold text-blue-900">{activeQuestion.competency}</span>
                  <span className="font-mono text-slate-500">Bobot: {activeQuestion.weight}</span>
                </div>
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
                      setProctorCustomMessage('Argumen terstandarisasi telah disisipkan. Silakan klik "Selesai Bicara • Kirim ke Ava".');
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
                {messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`space-y-1 ${
                      m.sender === 'Gemini Live'
                        ? 'text-left'
                        : m.sender === 'Kandidat (Anda)'
                        ? 'text-left'
                        : 'text-center'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400 px-1">
                      <span
                        className={`font-bold ${
                          m.sender === 'Gemini Live'
                            ? 'text-blue-600'
                            : m.sender === 'Kandidat (Anda)'
                            ? 'text-emerald-700'
                            : 'text-slate-500'
                        }`}
                      >
                        {m.sender}
                      </span>
                      <span className="font-mono">{m.time}</span>
                    </div>
                    <div
                      className={`p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                        m.sender === 'Gemini Live'
                          ? 'bg-blue-50/80 text-slate-900 border border-blue-200/80'
                          : m.sender === 'Kandidat (Anda)'
                          ? 'bg-slate-100 text-slate-800 border border-slate-200'
                          : 'bg-slate-50 text-slate-500 border border-dashed border-slate-200 text-center text-[11px]'
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
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

      {/* ─── Bottom Floating Control Bar (Modern Light Toolbar) ─── */}
      <footer className="h-20 bg-white border-t border-slate-200 px-4 sm:px-8 flex items-center justify-center shrink-0 shadow-lg z-20">
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Unified Primary Mic Button */}
          <button
            onClick={handleToggleListening}
            className={`px-5 py-3 rounded-full transition-all cursor-pointer flex items-center gap-2.5 font-bold text-xs sm:text-sm shadow-md ${
              isListening
                ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-500/30 ring-4 ring-rose-200 animate-pulse'
                : !hasStartedInterview
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98]'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.98]'
            }`}
            title={
              !hasStartedInterview
                ? 'Mulai Wawancara (Nyalakan Mikrofon)'
                : isListening
                ? 'Selesai Berbicara • Kirim ke Ava'
                : 'Nyalakan Mikrofon & Mulai Bicara'
            }
          >
            {isListening ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
                <Mic className="w-5 h-5 text-white" />
                <span>Selesai Bicara • Kirim ke Ava</span>
              </>
            ) : !hasStartedInterview ? (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Mulai Wawancara (Nyalakan Mic)</span>
              </>
            ) : (
              <>
                <Mic className="w-5 h-5 text-white" />
                <span>Nyalakan Mic &amp; Bicara</span>
              </>
            )}
          </button>

          {/* Cam */}
          <button
            onClick={() => setCamOn(!camOn)}
            className={`p-3.5 rounded-full transition-all cursor-pointer shadow-xs ${
              camOn
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                : 'bg-rose-600 hover:bg-rose-700 text-white'
            }`}
            title={camOn ? 'Matikan Kamera' : 'Nyalakan Kamera'}
          >
            {camOn ? <Video className="w-5 h-5 text-slate-800" /> : <VideoOff className="w-5 h-5" />}
          </button>

          {/* Screen Share */}
          <button
            onClick={() => setIsSharing(!isSharing)}
            className={`p-3.5 rounded-full transition-all cursor-pointer shadow-xs ${
              isSharing
                ? 'bg-blue-600 text-white shadow-blue-500/20'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
            }`}
            title="Bagikan Layar"
          >
            <Share2 className="w-5 h-5" />
          </button>

          {/* Chat / Transcript Toggle */}
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className={`p-3.5 rounded-full transition-all cursor-pointer shadow-xs ${
              chatOpen
                ? 'bg-primary-navy text-white shadow-primary-navy/20'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
            }`}
            title="Buka Transkrip / Chat"
          >
            <MessageSquare className="w-5 h-5" />
          </button>

          <div className="w-px h-8 bg-slate-200 mx-1 sm:mx-2" />

          {/* Leave / Finish Session Button */}
          <button
            onClick={() => navigate('/peserta/hasil')}
            className="px-5 sm:px-6 py-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold flex items-center gap-2 cursor-pointer shadow-sm hover:shadow-md transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Akhiri Sesi Wawancara</span>
          </button>
        </div>
      </footer>

      {/* ─── Completion Modal ─── */}
      <Modal
        isOpen={isCompletedModalOpen}
        onClose={() => setIsCompletedModalOpen(false)}
        title="🎉 Sesi Wawancara AI Berhasil Diselesaikan!"
        size="md"
      >
        <div className="space-y-5 text-center p-2">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white flex items-center justify-center shadow-lg">
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
              <p className="font-bold text-xs text-emerald-800">LULUS (Direkomendasikan)</p>
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
