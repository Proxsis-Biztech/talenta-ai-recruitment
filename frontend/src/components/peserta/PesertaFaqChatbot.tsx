import React, { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import {
  MessageSquare,
  X,
  Send,
  LifeBuoy,
  Bot,
  Loader2,
  CheckCircle2,
  ArrowRight,
  RefreshCw
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

interface HelpdeskTicket {
  id: string;
  ticketCode: string;
  subject: string;
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
  const [tab, setTab] = useState<'chat' | 'tickets'>('chat');
  const [faqItems, setFaqItems] = useState<FaqItem[]>([]);
  const [messages, setMessages] = useState<ChatEntry[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'Halo! Saya Asisten FAQ Asesmen RIGHT. Saya menjawab pertanyaan umum berdasarkan Basis Pengetahuan FAQ resmi. Jika pertanyaan Anda belum terjawab, Anda dapat langsung terhubung ke Helpdesk Internal.'
    }
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [tickets, setTickets] = useState<HelpdeskTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [escalating, setEscalating] = useState(false);
  const [ticketReplyMap, setTicketReplyMap] = useState<Record<string, string>>({});

  const getHeaders = () => {
    const token = getPortalToken() || localStorage.getItem('adminToken') || '';
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const loadFaqAndTickets = useCallback(async () => {
    try {
      const [faqResp, tktResp] = await Promise.all([
        axios.get('/api/peserta/faq-knowledge', { headers: getHeaders() }),
        axios.get('/api/peserta/helpdesk/tickets', { headers: getHeaders() })
      ]);
      setFaqItems(faqResp.data?.items || []);
      setTickets(tktResp.data?.tickets || []);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadFaqAndTickets();
    }
  }, [open, loadFaqAndTickets]);

  const sendFaqQuery = async (questionText: string) => {
    const clean = questionText.trim();
    if (!clean || sending) return;

    const userEntry: ChatEntry = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: clean
    };
    setMessages((prev) => [...prev, userEntry]);
    setInput('');
    setSending(true);

    try {
      const user = getPortalUser();
      const resp = await axios.post(
        '/api/peserta/faq-chat',
        {
          message: clean,
          companyName: user?.companyName
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
          text: 'Terjadi kendala saat menghubungi layanan FAQ. Silakan hubungkan ke Helpdesk Internal.',
          canEscalate: true,
          originalQuery: clean
        }
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleEscalateToHelpdesk = async (questionText: string) => {
    if (escalating) return;
    setEscalating(true);
    try {
      const user = getPortalUser();
      const resp = await axios.post(
        '/api/peserta/helpdesk/tickets',
        {
          subject: questionText.slice(0, 100),
          message: questionText,
          companyName: user?.companyName || '',
          programCode: localStorage.getItem('programCode') || user?.assessmentId || '-',
          candidateName: user?.name || localStorage.getItem('pesertaName') || 'Peserta',
          candidateEmail: user?.email || localStorage.getItem('pesertaUsername') || '',
          source: 'chatbot-faq'
        },
        { headers: getHeaders() }
      );
      const created: HelpdeskTicket | undefined = resp.data?.ticket;
      if (created) {
        setTickets((prev) => [created, ...prev]);
        setMessages((prev) => [
          ...prev,
          {
            id: `b-esc-${Date.now()}`,
            sender: 'bot',
            text: `Pertanyaan Anda telah diteruskan ke Helpdesk Internal dengan nomor tiket ${created.ticketCode}. Anda dapat memantau balasan tim pengawas pada tab "Tiket Helpdesk".`
          }
        ]);
        setTab('tickets');
      }
    } catch {
      // ignore
    } finally {
      setEscalating(false);
    }
  };

  const handleReplyTicket = async (ticketId: string) => {
    const text = (ticketReplyMap[ticketId] || '').trim();
    if (!text) return;
    try {
      const resp = await axios.post(
        `/api/peserta/helpdesk/tickets/${ticketId}/reply`,
        { message: text },
        { headers: getHeaders() }
      );
      const updated: HelpdeskTicket | undefined = resp.data?.ticket;
      if (updated) {
        setTickets((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
        setTicketReplyMap((prev) => ({ ...prev, [ticketId]: '' }));
      }
    } catch {
      // ignore
    }
  };

  const refreshTickets = async () => {
    setLoadingTickets(true);
    try {
      const resp = await axios.get('/api/peserta/helpdesk/tickets', { headers: getHeaders() });
      setTickets(resp.data?.tickets || []);
    } finally {
      setLoadingTickets(false);
    }
  };

  return (
    <>
      {/* Floating Launcher */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-primary-navy text-white shadow-lg hover:bg-primary-navy/90 transition-all text-xs font-bold"
        title="Chatbot FAQ & Helpdesk Internal"
      >
        <MessageSquare className="w-4 h-4" />
        <span className="hidden sm:inline">Chatbot FAQ &amp; Helpdesk</span>
        {tickets.some((t) => t.status !== 'resolved') && (
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
        )}
      </button>

      {/* Drawer / Modal */}
      {open && (
        <div className="fixed bottom-20 right-5 z-50 w-[360px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[540px]">
          {/* Header */}
          <div className="bg-primary-navy text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-blue-300" />
              <div>
                <p className="text-sm font-bold leading-tight">Chatbot FAQ RIGHT</p>
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

          {/* Tabs */}
          <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setTab('chat')}
              className={`flex-1 py-2.5 text-center ${
                tab === 'chat'
                  ? 'text-primary-navy border-b-2 border-primary-navy bg-white'
                  : 'text-slate-500'
              }`}
            >
              Tanya FAQ
            </button>
            <button
              type="button"
              onClick={() => setTab('tickets')}
              className={`flex-1 py-2.5 text-center flex items-center justify-center gap-1.5 ${
                tab === 'tickets'
                  ? 'text-primary-navy border-b-2 border-primary-navy bg-white'
                  : 'text-slate-500'
              }`}
            >
              <span>Tiket Helpdesk</span>
              {tickets.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-blue-100 text-primary-navy text-[10px]">
                  {tickets.length}
                </span>
              )}
            </button>
          </div>

          {tab === 'chat' ? (
            <>
              {/* Quick FAQ Chips */}
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

              {/* Messages */}
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
                        disabled={escalating}
                        onClick={() => handleEscalateToHelpdesk(m.originalQuery!)}
                        className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold hover:bg-amber-100"
                      >
                        <LifeBuoy className="w-3 h-3" />
                        Hubungkan ke Helpdesk Internal
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

              {/* Input */}
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
          ) : (
            <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-slate-500">
                  Riwayat Tiket Helpdesk Internal
                </p>
                <button
                  type="button"
                  onClick={refreshTickets}
                  className="text-xs text-blue-accent flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingTickets ? 'animate-spin' : ''}`} />
                  Muat ulang
                </button>
              </div>

              {tickets.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500 space-y-2">
                  <p>Belum ada tiket Helpdesk Internal.</p>
                  <p className="text-[11px] text-slate-400">
                    Gunakan tab Tanya FAQ lalu klik Hubungkan ke Helpdesk Internal jika perlu bantuan admin.
                  </p>
                </div>
              ) : (
                tickets.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl bg-white border border-slate-200 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-slate-500">
                        {t.ticketCode}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                          t.status === 'resolved'
                            ? 'bg-emerald-50 text-emerald-700'
                            : t.status === 'in_progress'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {t.status === 'resolved' && <CheckCircle2 className="w-3 h-3" />}
                        {t.status === 'resolved'
                          ? 'Selesai'
                          : t.status === 'in_progress'
                            ? 'Diproses'
                            : 'Menunggu'}
                      </span>
                    </div>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto">
                      {t.messages.map((m) => (
                        <div
                          key={m.id}
                          className={`text-[11px] p-2 rounded-lg ${
                            m.senderRole === 'admin'
                              ? 'bg-blue-50 text-slate-800 border border-blue-100'
                              : 'bg-slate-50 text-slate-700'
                          }`}
                        >
                          <span className="font-bold block text-[10px] text-slate-500">
                            {m.senderName}
                          </span>
                          {m.text}
                        </div>
                      ))}
                    </div>
                    {t.status !== 'resolved' && (
                      <div className="flex gap-1.5 pt-1">
                        <input
                          type="text"
                          value={ticketReplyMap[t.id] || ''}
                          onChange={(e) =>
                            setTicketReplyMap((prev) => ({ ...prev, [t.id]: e.target.value }))
                          }
                          placeholder="Balas ke Helpdesk..."
                          className="flex-1 px-2.5 py-1.5 text-[11px] border border-slate-200 rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => handleReplyTicket(t.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-primary-navy text-white text-[11px] font-semibold"
                        >
                          Kirim
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default PesertaFaqChatbot;
