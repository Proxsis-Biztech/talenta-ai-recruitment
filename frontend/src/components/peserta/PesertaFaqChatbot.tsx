import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import {
  MessageSquare,
  X,
  Send,
  LifeBuoy,
  Bot,
  Loader2,
  ArrowRight,
  UserCheck
} from 'lucide-react';
import { getPortalToken, getPortalUser } from '../../services/portalAuthService';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  sourceFile: string;
}

interface ChatEntry {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  matchedQuestion?: string | null;
  sourceFile?: string | null;
  canEscalate?: boolean;
  originalQuery?: string;
}

interface HelpdeskChatSession {
  id: string;
  candidateName: string;
  companyName: string;
  programCode: string;
  status: 'open' | 'in_progress' | 'resolved';
  messages: Array<{
    id: string;
    senderRole: 'peserta' | 'admin' | 'bot';
    senderName: string;
    text: string;
    createdAt: string;
  }>;
  updatedAt: string;
}

export const PesertaFaqChatbot: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'faq' | 'helpdesk'>('faq');
  const [faqItems, setFaqItems] = useState<FaqItem[]>([]);
  const [messages, setMessages] = useState<ChatEntry[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'Halo! Saya Asisten FAQ Asesmen RIGHT. Saya menjawab pertanyaan umum berdasarkan Basis Pengetahuan FAQ resmi. Jika butuh bantuan langsung, Anda dapat terhubung ke Chat Helpdesk Internal.'
    }
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  // Helpdesk Pre-chat Form + Live Chat Session state
  const portalUser = getPortalUser();
  const [formName, setFormName] = useState(
    () => portalUser?.name || localStorage.getItem('pesertaName') || ''
  );
  const [formCompany, setFormCompany] = useState(() => portalUser?.companyName || '');
  const [formProgram, setFormProgram] = useState(
    () => portalUser?.assessmentTitle || localStorage.getItem('programCode') || portalUser?.assessmentId || ''
  );
  const [startingChat, setStartingChat] = useState(false);
  const [activeSession, setActiveSession] = useState<HelpdeskChatSession | null>(null);
  const [helpdeskInput, setHelpdeskInput] = useState('');
  const [sendingHelpdesk, setSendingHelpdesk] = useState(false);
  const [pendingQuery, setPendingQuery] = useState('');

  const getHeaders = () => {
    const token = getPortalToken() || localStorage.getItem('adminToken') || '';
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const loadFaqAndActiveChat = useCallback(async () => {
    try {
      const [faqResp, chatResp] = await Promise.all([
        axios.get('/api/peserta/faq-knowledge', { headers: getHeaders() }),
        axios.get('/api/peserta/helpdesk/tickets', { headers: getHeaders() })
      ]);
      setFaqItems(faqResp.data?.items || []);
      const sessions: HelpdeskChatSession[] = chatResp.data?.tickets || [];
      const openSession = sessions.find((s) => s.status !== 'resolved') || null;
      if (openSession) {
        setActiveSession(openSession);
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadFaqAndActiveChat();
    }
  }, [open, loadFaqAndActiveChat]);

  // Poll for admin replies while in live helpdesk chat
  useEffect(() => {
    if (!open || mode !== 'helpdesk' || !activeSession) return;
    const timer = setInterval(async () => {
      try {
        const resp = await axios.get('/api/peserta/helpdesk/tickets', { headers: getHeaders() });
        const sessions: HelpdeskChatSession[] = resp.data?.tickets || [];
        const updated = sessions.find((s) => s.id === activeSession.id);
        if (updated) setActiveSession(updated);
      } catch {
        // silent
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [open, mode, activeSession]);

  const sendFaqQuery = async (questionText: string) => {
    const clean = questionText.trim();
    if (!clean || sending) return;

    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, sender: 'user', text: clean }]);
    setInput('');
    setSending(true);

    try {
      const resp = await axios.post(
        '/api/peserta/faq-chat',
        {
          message: clean,
          companyName: formCompany || portalUser?.companyName || ''
        },
        { headers: getHeaders() }
      );
      const data = resp.data;
      setMessages((prev) => [
        ...prev,
        {
          id: `b-${Date.now()}`,
          sender: 'bot',
          text: data.reply,
          matchedQuestion: data.matchedQuestion,
          sourceFile: data.sourceFile,
          canEscalate: data.canEscalate,
          originalQuery: clean
        }
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `b-${Date.now()}`,
          sender: 'bot',
          text: 'Terjadi kendala saat menghubungi layanan FAQ. Silakan lanjutkan ke Chat Helpdesk Internal.',
          canEscalate: true,
          originalQuery: clean
        }
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleOpenHelpdeskWithQuery = (queryText: string) => {
    setPendingQuery(queryText);
    setMode('helpdesk');
  };

  const handleStartHelpdeskChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCompany.trim() || !formProgram.trim() || startingChat) return;
    setStartingChat(true);
    try {
      const initialMsg =
        pendingQuery.trim() ||
        `Halo Helpdesk, saya ${formName.trim()} dari ${formCompany.trim()} (Program: ${formProgram.trim()}) membutuhkan bantuan.`;
      const resp = await axios.post(
        '/api/peserta/helpdesk/tickets',
        {
          subject: `${formName.trim()} • ${formProgram.trim()}`,
          message: initialMsg,
          companyName: formCompany.trim(),
          programCode: formProgram.trim(),
          candidateName: formName.trim(),
          candidateEmail: portalUser?.email || localStorage.getItem('pesertaUsername') || '',
          source: 'chatbot-faq'
        },
        { headers: getHeaders() }
      );
      if (resp.data?.ticket) {
        setActiveSession(resp.data.ticket);
        setPendingQuery('');
      }
    } catch {
      // ignore
    } finally {
      setStartingChat(false);
    }
  };

  const handleSendHelpdeskMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = helpdeskInput.trim();
    if (!text || !activeSession || sendingHelpdesk) return;
    setSendingHelpdesk(true);
    try {
      const resp = await axios.post(
        `/api/peserta/helpdesk/tickets/${activeSession.id}/reply`,
        { message: text },
        { headers: getHeaders() }
      );
      if (resp.data?.ticket) {
        setActiveSession(resp.data.ticket);
        setHelpdeskInput('');
      }
    } catch {
      // ignore
    } finally {
      setSendingHelpdesk(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes floatChatbot {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes popUpChatbot {
          from { opacity: 0; transform: translateY(14px) scale(0.96); }
          to { opacity: 1; transform: translateY(0px) scale(1); }
        }
      `}</style>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{ animation: open ? 'none' : 'floatChatbot 3.2s ease-in-out infinite' }}
        className="fixed bottom-6 right-6 z-40 group flex items-center gap-2.5 px-4 py-3 rounded-full bg-primary-navy text-white shadow-[0_14px_32px_-8px_rgba(15,39,92,0.5)] hover:bg-primary-navy/95 hover:scale-105 active:scale-95 transition-all duration-300 text-xs font-bold ring-4 ring-blue-500/15"
        title="Chatbot FAQ & Helpdesk Internal"
      >
        <span className="relative flex items-center justify-center">
          <span className="absolute inline-flex h-full w-full rounded-full bg-blue-300 opacity-40 animate-ping" />
          <MessageSquare className="w-4 h-4 relative transition-transform duration-300 group-hover:rotate-6" />
        </span>
        <span className="hidden sm:inline">Chatbot FAQ &amp; Helpdesk</span>
        <span
          className={`w-2 h-2 rounded-full ${
            activeSession && activeSession.status !== 'resolved'
              ? 'bg-emerald-400 animate-pulse'
              : 'bg-blue-300'
          }`}
        />
      </button>

      {open && (
        <div
          style={{ animation: 'popUpChatbot 0.22s ease-out forwards' }}
          className="fixed bottom-22 right-6 z-50 w-[370px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[560px]"
        >
          {/* Header */}
          <div className="bg-primary-navy text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-blue-300" />
              <div>
                <p className="text-sm font-bold leading-tight">Bantuan &amp; Chatbot FAQ</p>
                <p className="text-[10px] text-blue-200">Terhubung ke Helpdesk Internal</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1 rounded-lg hover:bg-white/10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Mode Switch */}
          <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMode('faq')}
              className={`flex-1 py-2.5 text-center ${
                mode === 'faq'
                  ? 'text-primary-navy border-b-2 border-primary-navy bg-white'
                  : 'text-slate-500'
              }`}
            >
              Chatbot FAQ
            </button>
            <button
              type="button"
              onClick={() => setMode('helpdesk')}
              className={`flex-1 py-2.5 text-center flex items-center justify-center gap-1.5 ${
                mode === 'helpdesk'
                  ? 'text-primary-navy border-b-2 border-primary-navy bg-white'
                  : 'text-slate-500'
              }`}
            >
              <LifeBuoy className="w-3.5 h-3.5" />
              <span>Chat Helpdesk</span>
            </button>
          </div>

          {mode === 'faq' ? (
            <>
              {faqItems.length > 0 && (
                <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/70 flex gap-1.5 overflow-x-auto">
                  {faqItems.slice(0, 4).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => sendFaqQuery(item.question)}
                      className="shrink-0 text-[11px] px-2.5 py-1 rounded-full bg-white border border-slate-200 text-slate-700 hover:border-blue-accent hover:text-primary-navy transition-colors"
                    >
                      {item.question.length > 34 ? `${item.question.slice(0, 34)}...` : item.question}
                    </button>
                  ))}
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-white">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[88%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                        m.sender === 'user'
                          ? 'bg-primary-navy text-white rounded-br-none'
                          : 'bg-slate-100 text-slate-800 rounded-bl-none'
                      }`}
                    >
                      {m.matchedQuestion && (
                        <p className="font-bold text-[11px] text-primary-navy mb-1">
                          {m.matchedQuestion}
                        </p>
                      )}
                      <p>{m.text}</p>
                      {m.sourceFile && (
                        <p className="text-[10px] text-slate-400 mt-1">Sumber: {m.sourceFile}</p>
                      )}
                    </div>
                    {m.canEscalate && m.originalQuery && (
                      <button
                        type="button"
                        onClick={() => handleOpenHelpdeskWithQuery(m.originalQuery!)}
                        className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold hover:bg-amber-100"
                      >
                        <LifeBuoy className="w-3 h-3" />
                        Hubungkan ke Chat Helpdesk
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
                {sending && (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Mencari jawaban di Basis Pengetahuan FAQ...
                  </div>
                )}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendFaqQuery(input);
                }}
                className="p-2.5 border-t border-slate-200 bg-slate-50 flex gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Tulis pertanyaan umum Anda..."
                  className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-accent/20"
                />
                <button
                  type="submit"
                  disabled={sending || !input.trim()}
                  className="px-3 py-2 rounded-xl bg-primary-navy text-white hover:bg-primary-navy/90 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </>
          ) : !activeSession ? (
            /* Pre-Chat Form before starting Helpdesk Chat */
            <form onSubmit={handleStartHelpdeskChat} className="p-4 space-y-3 overflow-y-auto bg-white">
              <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100 text-xs text-slate-700 flex items-start gap-2">
                <UserCheck className="w-4 h-4 text-primary-navy shrink-0 mt-0.5" />
                <span>
                  Lengkapi data berikut sebelum memulai chat dengan Admin Helpdesk Internal.
                </span>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Nama Lengkap *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Masukkan nama lengkap Anda"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-accent/20"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Perusahaan / Instansi *
                </label>
                <input
                  type="text"
                  required
                  value={formCompany}
                  onChange={(e) => setFormCompany(e.target.value)}
                  placeholder="Contoh: PT Telkom Indonesia"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-accent/20"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Program Asesmen yang Diambil *
                </label>
                <input
                  type="text"
                  required
                  value={formProgram}
                  onChange={(e) => setFormProgram(e.target.value)}
                  placeholder="Contoh: Software Engineer (SE-402)"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-accent/20"
                />
              </div>
              {pendingQuery && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Pertanyaan Awal
                  </label>
                  <textarea
                    rows={2}
                    value={pendingQuery}
                    onChange={(e) => setPendingQuery(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                  />
                </div>
              )}
              <button
                type="submit"
                disabled={startingChat}
                className="w-full py-2.5 rounded-xl bg-primary-navy text-white text-xs font-bold hover:bg-primary-navy/90 disabled:opacity-50"
              >
                {startingChat ? 'Menghubungkan ke Admin...' : 'Mulai Chat Helpdesk'}
              </button>
            </form>
          ) : (
            /* Live Helpdesk Chat Room */
            <>
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[11px]">
                <div className="truncate pr-2">
                  <span className="font-bold text-slate-800">{activeSession.candidateName}</span>
                  <span className="text-slate-500"> • {activeSession.companyName}</span>
                  <span className="block text-[10px] text-slate-400 truncate">
                    Program: {activeSession.programCode}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSession(null)}
                  className="shrink-0 text-[10px] font-semibold text-blue-accent hover:underline"
                >
                  Chat Baru
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-white">
                {activeSession.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col ${m.senderRole === 'admin' ? 'items-start' : 'items-end'}`}
                  >
                    <span className="text-[10px] text-slate-400 mb-0.5 px-1">
                      {m.senderRole === 'admin' ? `Admin (${m.senderName})` : m.senderName}
                    </span>
                    <div
                      className={`max-w-[85%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                        m.senderRole === 'admin'
                          ? 'bg-blue-50 border border-blue-100 text-slate-800 rounded-bl-none'
                          : 'bg-primary-navy text-white rounded-br-none'
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>

              <form
                onSubmit={handleSendHelpdeskMessage}
                className="p-2.5 border-t border-slate-200 bg-slate-50 flex gap-2"
              >
                <input
                  type="text"
                  value={helpdeskInput}
                  onChange={(e) => setHelpdeskInput(e.target.value)}
                  placeholder="Tulis pesan ke Admin Helpdesk..."
                  className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-accent/20"
                />
                <button
                  type="submit"
                  disabled={sendingHelpdesk || !helpdeskInput.trim()}
                  className="px-3 py-2 rounded-xl bg-primary-navy text-white hover:bg-primary-navy/90 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
};

export default PesertaFaqChatbot;
